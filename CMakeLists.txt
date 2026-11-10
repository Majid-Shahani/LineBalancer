cmake_minimum_required(VERSION 4.4.0)

set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "f35a9ac6-8463-4d38-8eec-5d6008153e7d")
project(line_balancer LANGUAGES CXX VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(CTest)
include(GNUInstallDirs)

if(WIN32)
  set(b_platform PLATFORM_WINDOWS)
elseif(APPLE)
  set(b_platform PLATFORM_MAC)
elseif (UNIX)
  set(b_platform PLATFORM_UNIX)
else()
  set(b_platform "")
endif()

if(MSVC)
  if(CMAKE_CXX_COMPILER_ARCHITECTURE_ID STREQUAL "x64")
    set(b_arch ARCH_X64)
  elseif(CMAKE_CXX_COMPILER_ARCHITECTURE_ID STREQUAL "ARM64")
    set(b_arch ARCH_ARM64)
  else()
    message(FATAL_ERROR "Unsupported MSVC architecture: ${CMAKE_CXX_COMPILER_ARCHITECTURE_ID}")
  endif()
else()
  if(CMAKE_SYSTEM_PROCESSOR MATCHES "^(x86_64|AMD64)$")
    set(b_arch ARCH_X64)
  elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "^(aarch64|arm64)$")
    set(b_arch ARCH_ARM64)
  else()
    message(FATAL_ERROR "Unsupported architecture: ${CMAKE_SYSTEM_PROCESSOR}")
  endif()
endif()

# json parser
set(JSON_BuildTests OFF CACHE INTERNAL "")
set(JSON_Install    OFF CACHE INTERNAL "")
set(NLOHMANN_JSON_BUILD_MODULES ON CACHE INTERNAL "")
add_subdirectory(vendor/json EXCLUDE_FROM_ALL)

# cpp-httplib
set(HTTPLIB_COMPILE ON CACHE INTERNAL "")
set(HTTPLIB_BUILD_MODULES ON CACHE INTERNAL "")
add_subdirectory(vendor/cpp-httplib)

add_subdirectory(simulator)
add_subdirectory(server)

# Tests
if (BUILD_TESTING)
  set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
  set(INSTALL_GMOCK OFF CACHE BOOL "" FORCE)
  add_subdirectory(vendor/googletest)
  add_subdirectory(tests)
endif()

# Install
install(
  EXPORT LineBalancerTargets
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/LineBalancer
  NAMESPACE LineBalancer::
)

include(CMakePackageConfigHelpers)
write_basic_package_version_file(
  ${CMAKE_CURRENT_BINARY_DIR}/LineBalancerConfigVersion.cmake
  COMPATIBILITY SameMajorVersion
)

install(
  FILES
    cmake/LineBalancerConfig.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/LineBalancerConfigVersion.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/LineBalancer
)
