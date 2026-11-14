#include <csignal>

import LineSimulator;
import httplib;
import std;

httplib::SSLServer g_srv{"cert.pem", "key.pem"};

int main() {
  // LS::Runner runner;

  g_srv.set_keep_alive_max_count(0); // unlimited requests per tcp handshake
  g_srv.set_keep_alive_timeout(5);   // in seconds
  auto stop{[](int) {
    g_srv.stop();
    std::print("\nServer Stopping.\n");
  }};

  std::signal(SIGINT, stop);
  std::signal(SIGTERM, stop);

  g_srv.Get("/", [](const auto& req, auto& res) {
    res.set_content(req.body, "text/plain");
  });
  g_srv.listen("localhost", 8443);

  /*
  srv.Get("/simulation", [](const auto&, auto& res) {
    res.set_content("no simulation in progress!", "text/plain");
    res.code = 200;
  });

  srv.Post("/simulation", [](const auto& req, auto& res) {
    if (runner.startRun()) { // atomic CAS, true if claimed, false if not
      res.set_content(
          "simulation in progress.\nuse get method to check progress.",
          "text/plain");
      res.code = 409;
      return;
    }

    if (auto data{isValidJson(req.body)}; data) {
      runner.startSimulation(data);
      res.set_content("request accepted", "text/plain");
      res.code = 202;
    } else {
      res.set_content("invalid JSON", "text/plain");
      res.code = 400;
      return;
    }
  });
  */

  return 0;
}
