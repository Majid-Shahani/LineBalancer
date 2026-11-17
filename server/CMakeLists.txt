add_executable(server)

set_target_properties(server
  PROPERTIES
    CXX_MODULE_STD ON
)

if (HTTPLIB_REQUIRE_OPENSSL)
  target_link_libraries(server
    PRIVATE
      ssl
      crypto
  )
endif()

target_compile_definitions(server
  PRIVATE
    ${b_platform}
    ${b_arch}
)

target_sources(server
 PRIVATE
  FILE_SET CXX_MODULES
  BASE_DIRS src
  FILES
    src/parser.ixx
    src/diagnostics.ixx

  FILE_SET SOURCES
  BASE_DIRS src
  FILES
    src/EntryPoint.cpp
    src/parser.cpp
)

target_link_libraries(server
  PRIVATE
    simulator
    httplib::httplib
    nlohmann_json_modules
)

install(
 TARGETS server RUNTIME
)
