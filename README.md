# Concurrent Thread-Safe LRU Cache Implementation (C++)

I designed and implemented a generic, thread-safe Least Recently Used (LRU) cache in C++17. The project combines a custom doubly linked list with a std::unordered_map to guarantee O(1) time complexity for get and put operations while ensuring full thread safety under concurrent workloads.

## Project Structure

- src/ConcurrentLRUCache.hpp: Thread-safe LRU cache implementation using std::shared_mutex and a segmented striped variant for high-concurrency workloads.
- src/BasicLRUCache.hpp: Single-threaded baseline implementation used to measure thread lock overhead.
- test/test_lru_cache.cpp: Suite of unit tests and multi-threaded stress tests verifying concurrency guarantees and eviction behavior.
- bench/benchmark_concurrency.cpp: Benchmarking utility measuring throughput under varying worker thread counts.

## How to Build and Run

You can compile using g++ with C++17 and thread support:

```bash
g++ -O3 -std=c++17 -pthread test/test_lru_cache.cpp -o test_lru_cache
./test_lru_cache

g++ -O3 -std=c++17 -pthread bench/benchmark_concurrency.cpp -o benchmark_concurrency
./benchmark_concurrency
```

Or build with CMake:

```bash
mkdir build && cd build
cmake ..
make
./test_lru_cache
./benchmark_concurrency
```

## Quick Example

```cpp
#include "ConcurrentLRUCache.hpp"
#include <iostream>
#include <string>

int main() {
    ConcurrentLRUCache<int, std::string> cache(2);

    cache.put(1, "one");
    cache.put(2, "two");

    if (auto val = cache.get(1)) {
        std::cout << "Found key 1: " << *val << "\n";
    }

    cache.put(3, "three");

    std::cout << "Has key 2: " << cache.contains(2) << "\n";
    std::cout << "Has key 3: " << cache.contains(3) << "\n";
    return 0;
}
```
