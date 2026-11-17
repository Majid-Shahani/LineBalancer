export module srv.parser;

import srv.diagnostics;
import LineSimulator;
import std;

export namespace Srv {

std::expected<LS::Model, Diagnostics> parseRequest(std::string_view body);
std::string toResponseBody(const Diagnostics& d);

} // namespace Srv
