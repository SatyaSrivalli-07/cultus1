#include "../src/ConcurrentLRUCache.hpp"
#include "../src/BasicLRUCache.hpp"
#include <iostream>
#include <chrono>
#include <vector>
#include <thread>
#include <iomanip>
#include <random>

void benchmark_thread_scalability() {
    std::cout << "=== Concurrency Throughput Benchmark (Operations / Sec) ===\n";
    std::cout << std::left << std::setw(12) << "Threads"
              << std::setw(25) << "Single Lock LRU (ops/s)"
              << std::setw(25) << "Segmented LRU (ops/s)" << "\n";

    std::vector<int> thread_counts = {1, 2, 4, 8, 16};
    const int ops_per_thread = 50000;
    const size_t capacity = 10000;

    for (int num_threads : thread_counts) {
        ConcurrentLRUCache<int, int> cache1(capacity);
        SegmentedLRUCache<int, int> cache2(capacity, 16);

        auto run_bench = [&](auto& cache) {
            auto start = std::chrono::high_resolution_clock::now();
            std::vector<std::thread> workers;

            for (int t = 0; t < num_threads; ++t) {
                workers.emplace_back([&cache, t, ops_per_thread]() {
                    std::mt19937 rng(t * 1000 + 42);
                    for (int i = 0; i < ops_per_thread; ++i) {
                        int key = rng() % 5000;
                        if (i % 5 == 0) {
                            cache.put(key, key * 2);
                        } else {
                            cache.get(key);
                        }
                    }
                });
            }

            for (auto& w : workers) {
                w.join();
            }

            auto end = std::chrono::high_resolution_clock::now();
            double elapsed_sec = std::chrono::duration<double>(end - start).count();
            double total_ops = static_cast<double>(num_threads * ops_per_thread);
            return total_ops / elapsed_sec;
        };

        double ops1 = run_bench(cache1);
        double ops2 = run_bench(cache2);

        std::cout << std::left << std::setw(12) << num_threads
                  << std::setw(25) << std::fixed << std::setprecision(0) << ops1
                  << std::setw(25) << ops2 << "\n";
    }
}

int main() {
    benchmark_thread_scalability();
    return 0;
}
