add_executable(tests)

set_target_properties(tests
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(tests
  PRIVATE
    ${b_platform}
    ${b_arch}
)

target_sources(tests
  PRIVATE
    FILE_SET SOURCES
    BASE_DIRS src
    FILES
      src/test.cpp
)

target_link_libraries(tests
  PRIVATE
    simulator
    GTest::gmock
)

include(GoogleTest)
gtest_discover_tests(tests)
