add_library(core)
set_target_properties(core
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(core
  PRIVATE
    ${b_platform}
    ${b_arch}
)

target_link_libraries(core PUBLIC $<$<CXX_COMPILER_ID:GNU>:stdc++exp>)

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
  EXPORT TemplateTargets
  FILE_SET HEADERS
  FILE_SET CXX_MODULES DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)