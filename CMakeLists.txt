cmake_minimum_required(VERSION 3.14)
project(PersistentRBTree CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(src)

add_executable(test_rbtree test/test_rbtree.cpp)
add_executable(benchmark bench/benchmark.cpp)
