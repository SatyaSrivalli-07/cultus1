#include "../src/ConcurrentLRUCache.hpp"
#include "../src/BasicLRUCache.hpp"
#include <iostream>
#include <cassert>
#include <vector>
#include <string>
#include <thread>
#include <atomic>
#include <chrono>
#include <random>

void run_test(const std::string& name, void (*fn)()) {
    try {
        fn();
        std::cout << "[PASS] " << name << "\n";
    } catch (const std::exception& e) {
        std::cout << "[FAIL] " << name << ": " << e.what() << "\n";
    }
}

void test_basic_get_put() {
    ConcurrentLRUCache<int, std::string> cache(3);
    cache.put(1, "one");
    cache.put(2, "two");
    cache.put(3, "three");

    assert(cache.get(1) == "one");
    assert(cache.get(2) == "two");
    assert(cache.get(3) == "three");
    assert(!cache.get(999).has_value());
}

void test_eviction_policy() {
    ConcurrentLRUCache<int, std::string> cache(2);
    cache.put(1, "one");
    cache.put(2, "two");
    cache.get(1);
    cache.put(3, "three");

    assert(cache.get(1) == "one");
    assert(!cache.get(2).has_value());
    assert(cache.get(3) == "three");
}

void test_update_existing_key() {
    ConcurrentLRUCache<int, std::string> cache(2);
    cache.put(1, "alpha");
    cache.put(1, "beta");

    assert(cache.get(1) == "beta");
    assert(cache.size() == 1);
}

void test_remove() {
    ConcurrentLRUCache<int, std::string> cache(3);
    cache.put(10, "ten");
    assert(cache.remove(10) == true);
    assert(cache.remove(10) == false);
    assert(!cache.get(10).has_value());
    assert(cache.size() == 0);
}

void test_concurrent_reads_and_writes() {
    ConcurrentLRUCache<int, int> cache(100);
    const int num_threads = 8;
    const int ops_per_thread = 5000;
    std::atomic<bool> start_flag(false);
    std::vector<std::thread> threads;

    for (int t = 0; t < num_threads; ++t) {
        threads.emplace_back([&cache, &start_flag, t, ops_per_thread]() {
            while (!start_flag.load()) {
                std::this_thread::yield();
            }
            std::mt19937 rng(t * 100);
            for (int i = 0; i < ops_per_thread; ++i) {
                int key = rng() % 200;
                if (i % 3 == 0) {
                    cache.put(key, key * 10);
                } else {
                    cache.get(key);
                }
            }
        });
    }

    start_flag.store(true);
    for (auto& th : threads) {
        th.join();
    }

    assert(cache.size() <= 100);
}

void test_segmented_cache_concurrency() {
    SegmentedLRUCache<int, std::string> cache(200, 8);
    const int num_threads = 10;
    const int ops_per_thread = 3000;
    std::vector<std::thread> threads;

    for (int t = 0; t < num_threads; ++t) {
        threads.emplace_back([&cache, t, ops_per_thread]() {
            for (int i = 0; i < ops_per_thread; ++i) {
                int key = (t * 100) + (i % 50);
                cache.put(key, "val_" + std::to_string(key));
                cache.get(key);
            }
        });
    }

    for (auto& th : threads) {
        th.join();
    }

    assert(cache.size() <= 200);
}

int main() {
    std::cout << "=== Running Concurrent LRU Cache Unit & Stress Tests ===\n";
    run_test("basic get and put", test_basic_get_put);
    run_test("eviction policy", test_eviction_policy);
    run_test("update existing key", test_update_existing_key);
    run_test("remove key", test_remove);
    run_test("concurrent reads and writes stress test", test_concurrent_reads_and_writes);
    run_test("segmented cache concurrency stress test", test_segmented_cache_concurrency);
    std::cout << "=== All tests completed ===\n";
    return 0;
}
