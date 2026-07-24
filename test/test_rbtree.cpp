#include "../src/PersistentRBTree.hpp"
#include <iostream>
#include <cassert>
#include <vector>
#include <string>
#include <random>

void run_test(const std::string& name, void (*fn)()) {
    try {
        fn();
        std::cout << "[PASS] " << name << "\n";
    } catch (const std::exception& e) {
        std::cout << "[FAIL] " << name << ": " << e.what() << "\n";
    }
}

void test_basic_insert_and_get() {
    PersistentRBTree<int, std::string> t;
    auto t1 = t.insert(10, "ten").insert(5, "five").insert(20, "twenty");
    
    assert(t1.get(10) == "ten");
    assert(t1.get(5) == "five");
    assert(t1.get(20) == "twenty");
    assert(!t1.get(999).has_value());
}

void test_overwrite_key() {
    PersistentRBTree<int, std::string> t;
    auto t1 = t.insert(1, "a").insert(1, "b");
    
    assert(t1.get(1) == "b");
    assert(t1.size() == 1);
}

void test_insert_immutability() {
    PersistentRBTree<int, std::string> t0;
    auto t1 = t0.insert(1, "a").insert(2, "b");
    auto t2 = t1.insert(3, "c");
    
    std::vector<int> expected1 = {1, 2};
    std::vector<int> expected2 = {1, 2, 3};
    
    assert(t1.keys() == expected1);
    assert(t2.keys() == expected2);
}

void test_delete_immutability() {
    PersistentRBTree<int, std::string> t0;
    auto t1 = t0.insert(1, "a").insert(2, "b").insert(3, "c");
    auto t2 = t1.remove(2);
    
    std::vector<int> expected1 = {1, 2, 3};
    std::vector<int> expected2 = {1, 3};
    
    assert(t1.keys() == expected1);
    assert(t2.keys() == expected2);
}

void test_structural_sharing() {
    PersistentRBTree<int, std::string> t;
    for (int i = 0; i < 15; ++i) {
        t = t.insert(i, "v" + std::to_string(i));
    }
    auto before = t;
    auto after = t.insert(1000, "far away");
    
    assert(before.root()->left == after.root()->left || before.root() == after.root()->left);
}

void test_historical_snapshot_survival() {
    std::vector<std::pair<PersistentRBTree<int, std::string>, int>> snapshots;
    PersistentRBTree<int, std::string> t;
    
    for (int k = 0; k < 200; ++k) {
        t = t.insert(k, "v" + std::to_string(k));
        if (k % 20 == 0) {
            snapshots.push_back({t, k});
        }
    }
    
    for (int k = 0; k < 100; k += 3) {
        t = t.remove(k);
    }
    
    for (const auto& snap : snapshots) {
        std::vector<int> expected;
        for (int k = 0; k <= snap.second; ++k) {
            expected.push_back(k);
        }
        assert(snap.first.keys() == expected);
    }
}

void test_random_inserts_invariants() {
    PersistentRBTree<int, int> t;
    std::mt19937 rng(42);
    std::vector<int> keys;
    
    for (int i = 0; i < 300; ++i) {
        int k = rng() % 2000;
        t = t.insert(k, k * 2);
        keys.push_back(k);
    }
    
    std::sort(keys.begin(), keys.end());
    keys.erase(std::unique(keys.begin(), keys.end()), keys.end());
    
    assert(t.keys() == keys);
    t.black_height();
}

void test_delete_leaf() {
    PersistentRBTree<int, int> t;
    for (int k : {10, 5, 15, 3, 7}) {
        t = t.insert(k, k);
    }
    t = t.remove(3);
    
    assert(!t.get(3).has_value());
    std::vector<int> expected = {5, 7, 10, 15};
    assert(t.keys() == expected);
    t.black_height();
}

void test_delete_node_with_two_children() {
    PersistentRBTree<int, int> t;
    for (int k = 1; k <= 15; ++k) {
        t = t.insert(k, k * 10);
    }
    t = t.remove(8);
    
    assert(!t.get(8).has_value());
    std::vector<int> expected = {1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15};
    assert(t.keys() == expected);
    t.black_height();
}

int main() {
    std::cout << "=== Running Persistent RB-Tree Unit Tests ===\n";
    run_test("basic insert and get", test_basic_insert_and_get);
    run_test("overwrite key", test_overwrite_key);
    run_test("insert immutability", test_insert_immutability);
    run_test("delete immutability", test_delete_immutability);
    run_test("structural sharing", test_structural_sharing);
    run_test("historical snapshot survival", test_historical_snapshot_survival);
    run_test("random inserts invariants", test_random_inserts_invariants);
    run_test("delete leaf", test_delete_leaf);
    run_test("delete node with two children", test_delete_node_with_two_children);
    std::cout << "=== All tests finished ===\n";
    return 0;
}
