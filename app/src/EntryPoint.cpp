import std;
import nlohmann.json;

std::string testJson() {
  auto j = nlohmann::json::parse(R"({"a": [1,2,3]})");
  return j.dump();
}

int main() {
  std::print("{}\n", testJson());
  // parse json
  // build graph
  // ??
  // simulate
  // output

  return 0;
}
