#!/usr/bin/env python3
"""Build and run the line balancer server and the web GUI.

    python dev.py                          configure + build, run server and `npm run dev`
    python dev.py --web preview            build the GUI, run server and `npm run preview`
    python dev.py --web off                server only
    python dev.py --preset clang --config Release
    python dev.py --no-build               skip cmake / vite build, just run

Expected layout (this file lives next to CMakeLists.txt):
    CMakeLists.txt, CMakePresets.json, dev.py
    web-gui/package.json
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "web-gui"
# The server opens "cert.pem" / "key.pem" relative to its working directory,
# so it runs from here. Add `.run/` to .gitignore.
RUN_DIR = ROOT / ".run"
SERVER_TARGET = "server"  # add_executable(server) in server/CMakeLists.txt
SERVER_URL = "https://localhost:8443"

WINDOWS = sys.platform == "win32"
DEFAULT_PRESET = "default" if WINDOWS else "gcc"


def die(msg: str):
    sys.exit(f"error: {msg}")


def run(cmd, cwd=ROOT) -> None:
    """Run a command to completion; abort the script if it fails."""
    print(f"\n$ {' '.join(map(str, cmd))}", flush=True)
    if subprocess.run(cmd, cwd=cwd).returncode != 0:
        die(f"command failed: {cmd[0]}")


# --------------------------------------------------------------------------
# CMakePresets.json / package.json
# --------------------------------------------------------------------------
def binary_dir(preset_name: str) -> Path:
    """Resolve a configure preset's binaryDir, following `inherits`."""
    data = json.loads((ROOT / "CMakePresets.json").read_text(encoding="utf-8"))
    presets = {p["name"]: p for p in data.get("configurePresets", [])}
    if preset_name not in presets:
        die(f"preset '{preset_name}' not found (available: {', '.join(presets)})")

    def lookup(name: str):
        preset = presets[name]
        if "binaryDir" in preset:
            return preset["binaryDir"]
        parents = preset.get("inherits", [])
        if isinstance(parents, str):
            parents = [parents]
        for parent in parents:
            if found := lookup(parent):
                return found
        return None

    raw = lookup(preset_name)
    if raw is None:
        die(f"preset '{preset_name}' has no binaryDir")
    raw = raw.replace("${sourceDir}", str(ROOT)).replace("${presetName}", preset_name)
    path = Path(raw)
    return path if path.is_absolute() else ROOT / path


def check_npm_scripts(needed: list[str]) -> None:
    pkg = json.loads((WEB_DIR / "package.json").read_text(encoding="utf-8"))
    scripts = pkg.get("scripts", {})
    missing = [s for s in needed if s not in scripts]
    if missing:
        die(f"package.json has no script(s): {', '.join(missing)}")


# --------------------------------------------------------------------------
# Server pieces
# --------------------------------------------------------------------------
def ensure_certs() -> None:
    RUN_DIR.mkdir(exist_ok=True)
    if (RUN_DIR / "cert.pem").exists() and (RUN_DIR / "key.pem").exists():
        return
    openssl = shutil.which("openssl") or die("openssl not found on PATH")
    # -days 365: `req -x509` defaults to 30 days, which would break the server
    # in a month. Delete .run/*.pem to regenerate.
    run(
        [openssl, "req", "-x509", "-noenc", "-days", "365",
         "-keyout", "key.pem", "-out", "cert.pem", "-subj", "/CN=localhost"],
        cwd=RUN_DIR,
    )


def find_server(bdir: Path, config: str) -> Path:
    exe = SERVER_TARGET + (".exe" if WINDOWS else "")
    # Multi-config generators put binaries in <subdir>/<Config>/
    for cand in (bdir / "server" / config / exe,
                 bdir / "server" / exe,
                 bdir / config / exe):
        if cand.is_file():
            return cand
    hits = [p for p in bdir.rglob(exe) if p.is_file() and config in p.parts]
    if hits:
        return hits[0]
    die(f"could not find '{exe}' under {bdir} (config {config}); build it first")


# --------------------------------------------------------------------------
# Process handling
# --------------------------------------------------------------------------
def spawn(cmd, cwd: Path) -> subprocess.Popen:
    print(f"\n$ {' '.join(map(str, cmd))}   (cwd: {cwd})", flush=True)
    kwargs = {"cwd": cwd, "stdin": subprocess.DEVNULL}
    if WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True  # own process group, so we can kill the tree
    return subprocess.Popen(cmd, **kwargs)


def stop(proc: subprocess.Popen) -> None:
    """Stop a process and everything it started (npm -> node -> vite)."""
    if proc.poll() is not None:
        return
    try:
        if WINDOWS:
            subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                           capture_output=True)
        else:
            os.killpg(proc.pid, signal.SIGTERM)  # server's SIGTERM handler stops it cleanly
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if not WINDOWS:
            os.killpg(proc.pid, signal.SIGKILL)
        proc.wait()
    except ProcessLookupError:
        pass


# --------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preset", default=DEFAULT_PRESET,
                    help=f"CMake configure preset (default: {DEFAULT_PRESET})")
    ap.add_argument("--config", default="Debug",
                    choices=["Debug", "Release", "RelWithDebInfo", "MinSizeRel"],
                    help="build configuration (default: Debug)")
    ap.add_argument("--web", default="dev", choices=["dev", "preview", "off"],
                    help="dev = `npm run dev`; preview = `npm run build` + `npm run preview`; "
                         "off = server only")
    ap.add_argument("--no-build", action="store_true",
                    help="skip cmake configure/build and the vite build")
    args = ap.parse_args()

    bdir = binary_dir(args.preset)

    npm = None
    if args.web != "off":
        npm = shutil.which("npm") or die("npm not found on PATH")
        check_npm_scripts(["dev"] if args.web == "dev" else ["build", "preview"])
        if not (WEB_DIR / "node_modules").is_dir():
            lock = (WEB_DIR / "package-lock.json").exists()
            run([npm, "ci" if lock else "install"], cwd=WEB_DIR)

    if not args.no_build:
        run(["cmake", "--preset", args.preset])
        run(["cmake", "--build", str(bdir), "--config", args.config])
        if args.web == "preview":
            run([npm, "run", "build"], cwd=WEB_DIR)

    ensure_certs()
    server = find_server(bdir, args.config)

    procs = {"server": spawn([str(server)], RUN_DIR)}
    if npm:
        procs["web"] = spawn([npm, "run", args.web], cwd=WEB_DIR)

    print(f"\nserver: {SERVER_URL}   (Ctrl+C to stop everything)", flush=True)
    try:
        while True:
            for name, proc in procs.items():
                if (code := proc.poll()) is not None:
                    print(f"\n[{name}] exited with code {code}; stopping the rest")
                    return code
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nstopping...")
        return 0
    finally:
        for proc in procs.values():
            stop(proc)


if __name__ == "__main__":
    sys.exit(main())
