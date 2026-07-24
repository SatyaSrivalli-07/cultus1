#ifndef NAIVE_COPY_RBTREE_HPP
#define NAIVE_COPY_RBTREE_HPP

#include "EphemeralRBTree.hpp"

template <typename K, typename V>
class NaiveCopyRBTree {
private:
    std::shared_ptr<EphemeralRBTree<K, V>> tree;

public:
    NaiveCopyRBTree() : tree(std::make_shared<EphemeralRBTree<K, V>>()) {}
    explicit NaiveCopyRBTree(std::shared_ptr<EphemeralRBTree<K, V>> t) : tree(std::move(t)) {}

    std::optional<V> get(const K& key) const {
        return tree->get(key);
    }

    NaiveCopyRBTree insert(K key, V value) const {
        auto next_tree = std::make_shared<EphemeralRBTree<K, V>>();
        for (const auto& k : tree->keys()) {
            if (auto val = tree->get(k)) {
                next_tree->insert(k, *val);
            }
        }
        next_tree->insert(std::move(key), std::move(value));
        return NaiveCopyRBTree(next_tree);
    }

    std::vector<K> keys() const {
        return tree->keys();
    }
};

#endif
