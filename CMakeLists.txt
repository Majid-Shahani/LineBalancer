cmake_minimum_required(VERSION 4.4.0)

set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "f35a9ac6-8463-4d38-8eec-5d6008153e7d")
project(starter_template LANGUAGES CXX VERSION 1.0.0)

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

add_subdirectory(core)
add_subdirectory(app)

# Tests
if (BUILD_TESTING)
  set(INSTALL_GTEST OFF CACHE BOOL "" FORCE)
  set(INSTALL_GMOCK OFF CACHE BOOL "" FORCE)
  add_subdirectory(vendor/googletest)
  add_subdirectory(tests)
endif()

# Install
install(
  EXPORT TemplateTargets
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Template
  NAMESPACE Template::
)

include(CMakePackageConfigHelpers)
write_basic_package_version_file(
  ${CMAKE_CURRENT_BINARY_DIR}/TemplateConfigVersion.cmake
  COMPATIBILITY SameMajorVersion
)

install(
  FILES
    cmake/TemplateConfig.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/TemplateConfigVersion.cmake
  DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/Template
)
