cmake_minimum_required(VERSION 3.10)
project(famos_engine)

set(CMAKE_CXX_STANDARD 17)

add_executable(
    famos_engine main.cpp
    DataManager.cpp
)

# Execute a shell command to get the target triple
execute_process(
  COMMAND rustc -Vv
  COMMAND grep host
  COMMAND cut -d " " -f 2
  OUTPUT_VARIABLE RUST_TARGET
  OUTPUT_STRIP_TRAILING_WHITESPACE
)

# Define the destination
set(TAURI_BIN_DIR "${CMAKE_SOURCE_DIR}/../src-tauri/binaries")

# Tell CMake to copy and rename the file after building
add_custom_command(TARGET famos_engine POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "${TAURI_BIN_DIR}"
    COMMAND ${CMAKE_COMMAND} -E copy 
        "$<TARGET_FILE:famos_engine>" 
        "${TAURI_BIN_DIR}/famos_engine-${RUST_TARGET}"
    COMMENT "Copying binary to Tauri directory as famos_engine-${RUST_TARGET}"
)
