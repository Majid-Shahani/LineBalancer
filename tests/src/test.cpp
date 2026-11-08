#include <gmock/gmock.h>
#include <immintrin.h>

import core;
import std;

using namespace std::chrono_literals;
using namespace std::chrono;

TEST(run, DoesItRun) {
  EXPECT_TRUE(true);
  EXPECT_EQ(core::findTheAnswer(), 42);
}

int main(int argc, char** argv) {
  ::testing::InitGoogleMock(&argc, argv);
  return RUN_ALL_TESTS();
}
