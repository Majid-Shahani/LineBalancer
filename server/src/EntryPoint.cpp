import srv.parser;
import srv.diagnostics;
import LineSimulator;
import httplib;
import std;

namespace {

httplib::SSLServer g_Srv{"cert.pem", "key.pem"};

void setupServerSettings() {
  g_Srv.new_task_queue = [] {
    return new httplib::ThreadPool(2, 4); // 2 minimum, 4 maximum
  };
  g_Srv.set_keep_alive_max_count(0); // unlimited requests per tcp handshake
  g_Srv.set_keep_alive_timeout(5);   // in seconds
}

void setupExecutable() {
  auto stop{[](int) { g_Srv.stop(); }};
  std::signal(15, stop); // SIGTERM
  std::signal(2, stop);  // SIGINT
}

} // namespace

int main() {
  setupExecutable();
  setupServerSettings();

  g_Srv.Get("/", [](const auto& req, auto& res) {
    res.set_content(req.body, "text/plain");
    res.status = 200;
  });

  g_Srv.Get("/simulation", [](const auto&, auto& res) {
    res.set_content("no simulation in progress!", "text/plain");
    res.status = 200;
  });

  g_Srv.Post("/simulation", [](const auto& req, auto& res) {
    if (!req.get_header_value("Content-Type").starts_with("application/json")) {
      res.status = 415;
      res.set_content(R"({"error":"unsupported_media_type"})",
                      "application/json");
      return;
    }

    auto model{Srv::parseRequest(req.body)};
    if (!model) {
      res.status =
          (model.error().kind == Srv::JSONError::Malformed ? 400 : 422);

      res.set_content(Srv::toResponseBody(model.error()), "application/json");
      return;
    }

    // try submit
    // if (!submitted) {
    //  res.status = 409;
    //  res.set_content(R"({"error":"busy"})", "application/json");
    // }

    res.status = 202;
    res.set_content("Simulation Started, use GET to check progress.",
                    "text/plain");
  });

  std::cout << "\nServer Listening On localhost:8443\n";
  g_Srv.listen("localhost", 8443);
  std::cout << "\nServer Stopping.\n";

  return 0;
}
