module core;

namespace core {

void HelloWorld() { std::print("Hello World!\n"); }

std::uint64_t findTheAnswer() { return 42; }

int random_duration(int lower, int higher) {
  std::random_device rd;
  std::mt19937 gen(rd());
  std::uniform_int_distribution<int> dist(lower, higher);

  return (dist(gen));
}

} // namespace core
