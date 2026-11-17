export module srv.diagnostics;

import nlohmann.json;
import std;

export namespace Srv {

enum class JSONError : std::uint8_t {
  Malformed, // not JSON
  Invalid,   // Incorrect JSON
};

struct ErrorPos {
  std::uint64_t offset{}; // in bytes
  std::uint64_t line{1};
  std::uint64_t column{1};
};

struct Issue {
  std::string path;
  std::string message;
  std::optional<ErrorPos> pos;
};

struct Diagnostics {
  static constexpr std::size_t maxIssues{64};

  JSONError kind{JSONError::Invalid};
  std::vector<Issue> issues;
  bool truncated{false};

  void add(std::string path, std::string message,
           std::optional<ErrorPos> pos = {}) {
    if (issues.size() >= maxIssues) {
      truncated = true;
      return;
    }
    issues.push_back(
        {.path = std::move(path), .message = std::move(message), .pos = pos});
  }

  [[nodiscard]] bool full() const noexcept {
    return issues.size() >= maxIssues;
  }
};

} // namespace Srv
