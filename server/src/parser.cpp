module srv.parser;

import nlohmann.json;

namespace {

// nlohmann reports the 1-based index of the last byte it read.
Srv::ErrorPos locate(std::string_view text, std::size_t byte) {
  const std::size_t offset{byte == 0 ? 0 : std::min(byte - 1, text.size())};
  const auto before{text.substr(0, offset)};
  const auto lastNl{before.rfind('\n')};
  return {
      .offset = offset,
      .line = 1 + static_cast<std::size_t>(std::ranges::count(before, '\n')),
      .column = lastNl == std::string_view::npos ? offset + 1 : offset - lastNl,
  };
}

std::string cleanMessage(std::string msg) {
  if (msg.starts_with("[json.exception")) {
    if (const auto p{msg.find("] ")}; p != std::string::npos)
      msg.erase(0, p + 2);
  }
  return msg;
}

std::expected<nlohmann::json, Srv::Diagnostics>
parseSyntax(std::string_view text) {
  try {
    return nlohmann::json::parse(text);
  } catch (const nlohmann::json::parse_error& e) {
    Srv::Diagnostics d{.kind = Srv::JSONError::Malformed};
    d.add("", cleanMessage(e.what()), locate(text, e.byte));
    return std::unexpected{std::move(d)};
  }
}

} // namespace

namespace Srv {

std::expected<LS::Model, Diagnostics> parseRequest(std::string_view body) {
  auto doc{parseSyntax(body)};
  if (!doc)
    return std::unexpected{std::move(doc.error())};
  // structure and types
  // cross-references
  return LS::Model{};
}

std::string toResponseBody(const Diagnostics& d) {
  using nlohmann::json;
  json body;
  body["error"] =
      d.kind == JSONError::Malformed ? "malformed_json" : "invalid_document";
  if (d.truncated)
    body["truncated"] = true;

  auto& arr{body["issues"] = json::array()};
  for (const auto& i : d.issues) {
    json o{{"path", i.path}, {"message", i.message}};
    if (i.pos) {
      o["line"] = i.pos->line;
      o["column"] = i.pos->column;
      o["offset"] = i.pos->offset;
    }
    arr.push_back(std::move(o));
  }
  return body.dump(-1, ' ', false, json::error_handler_t::replace);
}

} // namespace Srv
