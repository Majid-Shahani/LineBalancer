import LineSimulator;
import httplib;
import std;

namespace {

httplib::SSLServer g_srv{"cert.pem", "key.pem"};

void setupServerSettings() {
  g_srv.new_task_queue = [] {
    return new httplib::ThreadPool(2, 4); // 2 minimum, 4 maximum
  };
  g_srv.set_keep_alive_max_count(0); // unlimited requests per tcp handshake
  g_srv.set_keep_alive_timeout(5);   // in seconds
}

void setupExecutable() {
  auto stop{[](int) {
    g_srv.stop();
    std::print("\nServer Stopping.\n");
  }};
  std::signal(15, stop); // SIGTERM
  std::signal(2, stop);  // SIGINT
}

} // namespace

int main() {
  setupServerSettings();
  setupExecutable();

  g_srv.Get("/", [](const auto& req, auto& res) {
    res.set_content(req.body, "text/plain");
    res.status = 200;
  });
  g_srv.Get("/simulation", [](const auto&, auto& res) {
    res.set_content("no simulation in progress!", "text/plain");
    res.status = 200;
  });

  g_srv.listen("localhost", 8443);

  /*
  LS::Runner runner;
  srv.Post("/simulation", [](const auto& req, auto& res) {
    if (runner.startRun()) { // atomic CAS, true if claimed, false if not
      res.set_content(
          "simulation in progress.\nuse get method to check progress.",
          "text/plain");
      res.status = 409;
      return;
    }

    if (auto data{isValidJson(req.body)}; data) {
      runner.startSimulation(data);
      res.set_content("request accepted", "text/plain");
      res.status = 202;
    } else {
      res.set_content("invalid JSON", "text/plain");
      res.status = 400;
      return;
    }
  });
  */

  return 0;
}
