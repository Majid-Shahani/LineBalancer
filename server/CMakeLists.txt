add_executable(server)

set_target_properties(server
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(server
  PRIVATE
    ${b_platform}
    ${b_arch}
)

target_sources(server
 PRIVATE
  FILE_SET SOURCES
  BASE_DIRS src
  FILES
    src/EntryPoint.cpp
)

target_link_libraries(server
  PRIVATE
    simulator
    httplib::httplib
)

install(
 TARGETS server
  EXPORT LineBalancerTargets
)
