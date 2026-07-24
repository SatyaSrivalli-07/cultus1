# Persistent Red-Black Tree Implementation (C++)

This project implements a fully persistent Red-Black Tree in modern C++ (C++17) using path copying and structural sharing. Previous versions of the data structure are preserved and remain accessible after updates without performing full deep copies.

## Overview

- `src/PersistentRBTree.hpp`: Immutable persistent Red-Black Tree implementation using `std::shared_ptr<const Node<K,V>>` for structural sharing.
- `src/EphemeralRBTree.hpp`: Standard in-place mutating Red-Black Tree baseline.
- `src/NaiveCopyRBTree.hpp`: Naive baseline that clones the full tree before each modification.
- `test/test_rbtree.cpp`: Unit test suite verifying correctness, snapshot persistence, structural sharing, and balance invariants.
- `bench/benchmark.cpp`: Performance comparison tool measuring insertion time across all three implementations.

## Requirements

A C++ compiler supporting C++17 (g++, clang++, or MSVC cl).

## Building and Running

Using standard g++ compiler:

```bash
g++ -O3 -std=c++17 test/test_rbtree.cpp -o test_rbtree
./test_rbtree

g++ -O3 -std=c++17 bench/benchmark.cpp -o benchmark
./benchmark
```

Using CMake:

```bash
mkdir build && cd build
cmake ..
make
./test_rbtree
./benchmark
```

## Basic Usage Example

```cpp
#include "PersistentRBTree.hpp"
#include <iostream>

int main() {
    PersistentRBTree<int, std::string> t0;
    auto t1 = t0.insert(10, "apple");
    auto t2 = t1.insert(20, "banana");

    // t1 remains unmodified
    std::cout << "t1 size: " << t1.size() << "\n"; // 1
    std::cout << "t2 size: " << t2.size() << "\n"; // 2

    auto t3 = t2.remove(10);
    // t2 still contains key 10
    std::cout << "t2 contains 10: " << t2.contains(10) << "\n"; // true
    std::cout << "t3 contains 10: " << t3.contains(10) << "\n"; // false
    return 0;
}
```
