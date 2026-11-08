add_library(core)
set_target_properties(core
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(core
  PRIVATE
    ${b_platform}
    ${b_arch}
    # json parser modules
    NLOHMANN_JSON_BUILD_MODULES
)

target_link_libraries(core
  PUBLIC
    $<$<CXX_COMPILER_ID:GNU>:stdc++exp>
  PRIVATE
    $<BUILD_INTERFACE:nlohmann_json_modules>
)

target_sources(core
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
  core
  EXPORT LineBalancerTargets
  FILE_SET HEADERS
  FILE_SET CXX_MODULES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)
