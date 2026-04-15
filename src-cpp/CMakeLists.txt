cmake_minimum_required(VERSION 3.10)
project(famos_engine)

set(CMAKE_CXX_STANDARD 17)

add_executable(
    famos_engine main.cpp
    DataManager.cpp
)