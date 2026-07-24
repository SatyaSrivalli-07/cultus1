#include "../src/PersistentRBTree.hpp"
#include "../src/EphemeralRBTree.hpp"
#include "../src/NaiveCopyRBTree.hpp"
#include <iostream>
#include <chrono>
#include <vector>
#include <numeric>
#include <random>
#include <iomanip>

std::vector<int> generate_shuffled_ints(int n, unsigned int seed = 42) {
    std::vector<int> arr(n);
    std::iota(arr.begin(), arr.end(), 0);
    std::mt19937 g(seed);
    std::shuffle(arr.begin(), arr.end(), g);
    return arr;
}

double measure_insert_persistent(const std::vector<int>& keys, std::vector<PersistentRBTree<int, int>>& history) {
    auto t0 = std::chrono::high_resolution_clock::now();
    PersistentRBTree<int, int> t;
    for (int k : keys) {
        t = t.insert(k, k);
        history.push_back(t);
    }
    auto t1 = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(t1 - t0).count();
}

double measure_insert_ephemeral(const std::vector<int>& keys) {
    auto t0 = std::chrono::high_resolution_clock::now();
    EphemeralRBTree<int, int> t;
    for (int k : keys) {
        t.insert(k, k);
    }
    auto t1 = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(t1 - t0).count();
}

double measure_insert_naive(const std::vector<int>& keys, int cap) {
    auto t0 = std::chrono::high_resolution_clock::now();
    NaiveCopyRBTree<int, int> t;
    for (int i = 0; i < cap; ++i) {
        t = t.insert(keys[i], keys[i]);
    }
    auto t1 = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(t1 - t0).count();
}

int main() {
    std::cout << "=== Benchmark: Persistent vs Ephemeral Insertion ===\n";
    std::cout << std::left << std::setw(10) << "Size"
              << std::setw(20) << "Persistent (ms)"
              << std::setw(20) << "Ephemeral (ms)" << "\n";
    
    std::vector<int> sizes = {1000, 5000, 20000, 50000};
    for (int n : sizes) {
        auto keys = generate_shuffled_ints(n);
        std::vector<PersistentRBTree<int, int>> history;
        double p_time = measure_insert_persistent(keys, history);
        double e_time = measure_insert_ephemeral(keys);
        
        std::cout << std::left << std::setw(10) << n
                  << std::setw(20) << std::fixed << std::setprecision(2) << p_time
                  << std::setw(20) << e_time << "\n";
    }

    std::cout << "\n=== Benchmark: Path-Copying vs Naive Deep-Copy ===\n";
    std::cout << std::left << std::setw(10) << "Size"
              << std::setw(20) << "Persistent (ms)"
              << std::setw(20) << "Naive-Copy (ms)" << "\n";
    
    std::vector<int> naive_sizes = {200, 1000, 3000};
    for (int n : naive_sizes) {
        auto keys = generate_shuffled_ints(n);
        std::vector<PersistentRBTree<int, int>> history;
        double p_time = measure_insert_persistent(keys, history);
        double n_time = measure_insert_naive(keys, n);
        
        std::cout << std::left << std::setw(10) << n
                  << std::setw(20) << std::fixed << std::setprecision(2) << p_time
                  << std::setw(20) << n_time << "\n";
    }

    return 0;
}
