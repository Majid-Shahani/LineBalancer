add_executable(app)

set_target_properties(app
  PROPERTIES
    CXX_MODULE_STD ON
)

target_compile_definitions(app
  PRIVATE
    ${b_platform}
    ${b_arch}
)

target_sources(app
 PRIVATE
  FILE_SET SOURCES
  BASE_DIRS src
  FILES
    src/EntryPoint.cpp
)

target_link_libraries(app
  PRIVATE
   core
)

install(
 TARGETS app
  EXPORT LineBalancerTargets
)
