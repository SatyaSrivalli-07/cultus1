cmake_minimum_required(VERSION 3.14)
project(ConcurrentLRUCache CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Threads REQUIRED)

include_directories(src)

add_executable(test_lru_cache test/test_lru_cache.cpp)
target_link_libraries(test_lru_cache PRIVATE Threads::Threads)

add_executable(benchmark_concurrency bench/benchmark_concurrency.cpp)
target_link_libraries(benchmark_concurrency PRIVATE Threads::Threads)
