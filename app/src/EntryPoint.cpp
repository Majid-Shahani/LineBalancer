import core;
import std;

int main() {
  core::HelloWorld();
  std::cout << "=== Build Information ===\n";

#ifdef PLATFORM_WINDOWS
  std::print("Platform: Windows\n");
#else
  std::print("Platform: Unix\n");
#endif

  // Architecture
  std::cout << "Architecture: ";

#if defined(_WIN64) || defined(__x86_64__) || defined(__aarch64__) ||          \
    defined(__ppc64__)
  std::cout << "64-bit\n";
#elif defined(_WIN32) || defined(__i386__) || defined(__arm__) ||              \
    defined(__ppc__)
  std::cout << "32-bit\n";
#else
  std::cout << "Unknown\n";
#endif

  // Compiler
  std::cout << "Compiler: ";

#if defined(_MSC_VER)
  std::cout << "MSVC\n";
#elif defined(__clang__)
  std::cout << "Clang\n";
#elif defined(__GNUC__)
  std::cout << "GCC\n";
#else
  std::cout << "Unknown\n";
#endif

  // Build configuration
  std::cout << "Configuration: ";

#if !defined(NDEBUG) || defined(_DEBUG)
  std::cout << "Debug\n";
#else
  std::cout << "Release (or undefined)\n";
#endif

  // C++ standard
  std::cout << "C++ standard: ";

#if __cplusplus >= 202302L
  std::cout << "C++23\n";
#elif __cplusplus >= 202002L
  std::cout << "C++20\n";
#elif __cplusplus >= 201703L
  std::cout << "C++17\n";
#elif __cplusplus >= 201402L
  std::cout << "C++14\n";
#else
  std::cout << "Older\n";
#endif
  return 0;
}
