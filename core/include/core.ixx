export module core;
import std;

namespace core {

using std::int32_t;
using std::uint16_t;
using std::uint32_t;
using std::uint64_t;
using std::uint8_t;

export void HelloWorld();
export uint64_t findTheAnswer();
export int random_duration(int lower = 0, int higher = 10);

} // namespace core
