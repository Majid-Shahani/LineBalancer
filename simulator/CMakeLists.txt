add_library(simulator)
set_target_properties(simulator
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(simulator
  PRIVATE
    ${b_platform}
    ${b_arch}
    # json parser modules
    NLOHMANN_JSON_BUILD_MODULES
)

target_link_libraries(simulator
  PUBLIC
    $<$<CXX_COMPILER_ID:GNU>:stdc++exp>
  PRIVATE
    $<BUILD_INTERFACE:nlohmann_json_modules>
)

target_sources(simulator
  PUBLIC
    FILE_SET CXX_MODULES
    BASE_DIRS include
    FILES
      include/core.ixx
  PRIVATE
    FILE_SET SOURCES
    BASE_DIRS src
    FILES
      src/core.cpp
)

install(TARGETS
  simulator
  EXPORT LineBalancerTargets
  FILE_SET HEADERS
  FILE_SET CXX_MODULES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
