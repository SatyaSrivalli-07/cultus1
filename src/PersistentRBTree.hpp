#ifndef PERSISTENT_RBTREE_HPP
#define PERSISTENT_RBTREE_HPP

#include <memory>
#include <vector>
#include <utility>
#include <stdexcept>
#include <algorithm>
#include <optional>

enum class Color { RED, BLACK };

template <typename K, typename V>
struct Node {
    K key;
    V value;
    Color color;
    std::shared_ptr<const Node<K, V>> left;
    std::shared_ptr<const Node<K, V>> right;

    Node(K k, V v, Color c,
         std::shared_ptr<const Node<K, V>> l = nullptr,
         std::shared_ptr<const Node<K, V>> r = nullptr)
        : key(std::move(k)), value(std::move(v)), color(c),
          left(std::move(l)), right(std::move(r)) {}
};

template <typename K, typename V>
class PersistentRBTree {
public:
    using NodePtr = std::shared_ptr<const Node<K, V>>;

    PersistentRBTree() : root_(nullptr) {}
    explicit PersistentRBTree(NodePtr root) : root_(std::move(root)) {}

    NodePtr root() const { return root_; }

    std::optional<V> get(const K& key) const {
        NodePtr curr = root_;
        while (curr) {
            if (key < curr->key) {
                curr = curr->left;
            } else if (curr->key < key) {
                curr = curr->right;
            } else {
                return curr->value;
            }
        }
        return std::nullopt;
    }

    bool contains(const K& key) const {
        return get(key).has_value();
    }

    PersistentRBTree insert(K key, V value) const {
        NodePtr new_root = ins(root_, std::move(key), std::move(value));
        new_root = recolor(new_root, Color::BLACK);
        return PersistentRBTree(new_root);
    }

    PersistentRBTree remove(const K& key) const {
        if (!contains(key)) {
            return *this;
        }
        auto [new_root, deficit] = del(root_, key);
        if (new_root) {
            new_root = recolor(new_root, Color::BLACK);
        }
        return PersistentRBTree(new_root);
    }

    std::vector<K> keys() const {
        std::vector<K> result;
        inorder_keys(root_, result);
        return result;
    }

    std::vector<std::pair<K, V>> entries() const {
        std::vector<std::pair<K, V>> result;
        inorder_entries(root_, result);
        return result;
    }

    size_t size() const {
        return node_count(root_);
    }

    int black_height() const {
        return check_black_height(root_);
    }

private:
    NodePtr root_;

    static NodePtr make_node(K key, V value, Color color, NodePtr left, NodePtr right) {
        return std::make_shared<const Node<K, V>>(std::move(key), std::move(value), color, std::move(left), std::move(right));
    }

    static NodePtr recolor(const NodePtr& n, Color color) {
        if (!n) return nullptr;
        return make_node(n->key, n->value, color, n->left, n->right);
    }

    static bool is_red(const NodePtr& n) {
        return n && n->color == Color::RED;
    }

    static Color get_color(const NodePtr& n) {
        return n ? n->color : Color::BLACK;
    }

    static NodePtr balance(Color color, NodePtr left, K key, V value, NodePtr right) {
        if (color == Color::BLACK) {
            if (is_red(left) && is_red(left->left)) {
                return make_node(left->key, left->value, Color::RED,
                                 recolor(left->left, Color::BLACK),
                                 make_node(std::move(key), std::move(value), Color::BLACK, left->right, std::move(right)));
            }
            if (is_red(left) && is_red(left->right)) {
                return make_node(left->right->key, left->right->value, Color::RED,
                                 make_node(left->key, left->value, Color::BLACK, left->left, left->right->left),
                                 make_node(std::move(key), std::move(value), Color::BLACK, left->right->right, std::move(right)));
            }
            if (is_red(right) && is_red(right->left)) {
                return make_node(right->left->key, right->left->value, Color::RED,
                                 make_node(std::move(key), std::move(value), Color::BLACK, std::move(left), right->left->left),
                                 make_node(right->key, right->value, Color::BLACK, right->left->right, right->right));
            }
            if (is_red(right) && is_red(right->right)) {
                return make_node(right->key, right->value, Color::RED,
                                 make_node(std::move(key), std::move(value), Color::BLACK, std::move(left), right->left),
                                 recolor(right->right, Color::BLACK));
            }
        }
        return make_node(std::move(key), std::move(value), color, std::move(left), std::move(right));
    }

    static NodePtr ins(const NodePtr& n, K key, V value) {
        if (!n) {
            return make_node(std::move(key), std::move(value), Color::RED, nullptr, nullptr);
        }
        if (key < n->key) {
            return balance(n->color, ins(n->left, std::move(key), std::move(value)), n->key, n->value, n->right);
        }
        if (n->key < key) {
            return balance(n->color, n->left, n->key, n->value, ins(n->right, std::move(key), std::move(value)));
        }
        return make_node(n->key, std::move(value), n->color, n->left, n->right);
    }

    struct DelResult {
        NodePtr node;
        bool deficit;
    };

    static NodePtr min_node(NodePtr n) {
        while (n->left) {
            n = n->left;
        }
        return n;
    }

    static DelResult fix_deficit_left(NodePtr n) {
        NodePtr sib = n->right;
        if (get_color(sib) == Color::RED) {
            NodePtr new_n = make_node(n->key, n->value, Color::RED, n->left, sib->left);
            auto [fixed_n, _] = fix_deficit_left(new_n);
            return { make_node(sib->key, sib->value, n->color, fixed_n, sib->right), false };
        }

        bool sib_left_red = is_red(sib->left);
        bool sib_right_red = is_red(sib->right);

        if (!sib_left_red && !sib_right_red) {
            NodePtr new_sib = make_node(sib->key, sib->value, Color::RED, sib->left, sib->right);
            Color new_color = (n->color == Color::RED) ? Color::BLACK : n->color;
            NodePtr merged = make_node(n->key, n->value, new_color, n->left, new_sib);
            return { merged, n->color != Color::RED };
        }

        if (!sib_right_red) {
            sib = make_node(sib->left->key, sib->left->value, Color::BLACK, sib->left->left,
                            make_node(sib->key, sib->value, Color::RED, sib->left->right, sib->right));
        }

        NodePtr new_left = make_node(n->key, n->value, Color::BLACK, n->left, sib->left);
        return { make_node(sib->key, sib->value, n->color, new_left, recolor(sib->right, Color::BLACK)), false };
    }

    static DelResult fix_deficit_right(NodePtr n) {
        NodePtr sib = n->left;
        if (get_color(sib) == Color::RED) {
            NodePtr new_n = make_node(n->key, n->value, Color::RED, sib->right, n->right);
            auto [fixed_n, _] = fix_deficit_right(new_n);
            return { make_node(sib->key, sib->value, n->color, sib->left, fixed_n), false };
        }

        bool sib_left_red = is_red(sib->left);
        bool sib_right_red = is_red(sib->right);

        if (!sib_left_red && !sib_right_red) {
            NodePtr new_sib = make_node(sib->key, sib->value, Color::RED, sib->left, sib->right);
            Color new_color = (n->color == Color::RED) ? Color::BLACK : n->color;
            NodePtr merged = make_node(n->key, n->value, new_color, new_sib, n->right);
            return { merged, n->color != Color::RED };
        }

        if (!sib_left_red) {
            sib = make_node(sib->right->key, sib->right->value, Color::BLACK,
                            make_node(sib->key, sib->value, Color::RED, sib->left, sib->right->left),
                            sib.right->right);
        }

        NodePtr new_right = make_node(n->key, n->value, Color::BLACK, sib->right, n->right);
        return { make_node(sib->key, sib->value, n->color, recolor(sib->left, Color::BLACK), new_right), false };
    }

    static DelResult del(const NodePtr& n, const K& key) {
        if (!n) {
            return { nullptr, false };
        }
        if (key < n->key) {
            auto [new_left, deficit] = del(n->left, key);
            NodePtr merged = make_node(n->key, n->value, n->color, new_left, n->right);
            return deficit ? fix_deficit_left(merged) : DelResult{ merged, false };
        }
        if (n->key < key) {
            auto [new_right, deficit] = del(n->right, key);
            NodePtr merged = make_node(n->key, n->value, n->color, n->left, new_right);
            return deficit ? fix_deficit_right(merged) : DelResult{ merged, false };
        }

        if (!n->left && !n->right) {
            if (n->color == Color::RED) return { nullptr, false };
            return { nullptr, true };
        }
        if (!n->left || !n->right) {
            NodePtr child = n->left ? n->left : n->right;
            return { recolor(child, Color::BLACK), false };
        }

        NodePtr succ = min_node(n->right);
        auto [new_right, deficit] = del(n->right, succ->key);
        NodePtr merged = make_node(succ->key, succ->value, n->color, n->left, new_right);
        return deficit ? fix_deficit_right(merged) : DelResult{ merged, false };
    }

    static void inorder_keys(const NodePtr& n, std::vector<K>& out) {
        if (!n) return;
        inorder_keys(n->left, out);
        out.push_back(n->key);
        inorder_keys(n->right, out);
    }

    static void inorder_entries(const NodePtr& n, std::vector<std::pair<K, V>>& out) {
        if (!n) return;
        inorder_entries(n->left, out);
        out.push_back({n->key, n->value});
        inorder_entries(n->right, out);
    }

    static size_t node_count(const NodePtr& n) {
        if (!n) return 0;
        return 1 + node_count(n->left) + node_count(n->right);
    }

    static int check_black_height(const NodePtr& n) {
        if (!n) return 1;
        if (n->color == Color::RED && (is_red(n->left) || is_red(n->right))) {
            throw std::runtime_error("Red-red violation in tree");
        }
        int lh = check_black_height(n->left);
        int rh = check_black_height(n->right);
        if (lh != rh) {
            throw std::runtime_error("Black-height mismatch in tree");
        }
        return lh + (n->color == Color::BLACK ? 1 : 0);
    }
};

#endif
