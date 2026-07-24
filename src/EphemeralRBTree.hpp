#ifndef EPHEMERAL_RBTREE_HPP
#define EPHEMERAL_RBTREE_HPP

#include <vector>
#include <optional>
#include <utility>

template <typename K, typename V>
class EphemeralRBTree {
private:
    enum class Color { RED, BLACK };

    struct Node {
        K key;
        V value;
        Color color;
        Node* left;
        Node* right;
        Node* parent;

        Node(K k, V v, Color c)
            : key(std::move(k)), value(std::move(v)), color(c),
              left(nullptr), right(nullptr), parent(nullptr) {}
    };

    Node* root;

    void rotate_left(Node* x) {
        Node* y = x->right;
        x->right = y->left;
        if (y->left) y->left->parent = x;
        y->parent = x->parent;
        if (!x->parent) root = y;
        else if (x == x->parent->left) x->parent->left = y;
        else x->parent->right = y;
        y->left = x;
        x->parent = y;
    }

    void rotate_right(Node* x) {
        Node* y = x->left;
        x->left = y->right;
        if (y->right) y->right->parent = x;
        y->parent = x->parent;
        if (!x->parent) root = y;
        else if (x == x->parent->right) x->parent->right = y;
        else x->parent->left = y;
        y->right = x;
        x->parent = y;
    }

    void fix_insert(Node* n) {
        while (n->parent && n->parent->color == Color::RED) {
            Node* grand = n->parent->parent;
            if (!grand) break;
            if (n->parent == grand->left) {
                Node* uncle = grand->right;
                if (uncle && uncle->color == Color::RED) {
                    n->parent->color = Color::BLACK;
                    uncle->color = Color::BLACK;
                    grand->color = Color::RED;
                    n = grand;
                } else {
                    if (n == n->parent->right) {
                        n = n->parent;
                        rotate_left(n);
                    }
                    n->parent->color = Color::BLACK;
                    n->parent->parent->color = Color::RED;
                    rotate_right(n->parent->parent);
                }
            } else {
                Node* uncle = grand->left;
                if (uncle && uncle->color == Color::RED) {
                    n->parent->color = Color::BLACK;
                    uncle->color = Color::BLACK;
                    grand->color = Color::RED;
                    n = grand;
                } else {
                    if (n == n->parent->left) {
                        n = n->parent;
                        rotate_right(n);
                    }
                    n->parent->color = Color::BLACK;
                    n->parent->parent->color = Color::RED;
                    rotate_left(n->parent->parent);
                }
            }
        }
        root->color = Color::BLACK;
    }

    void destroy(Node* n) {
        if (!n) return;
        destroy(n->left);
        destroy(n->right);
        delete n;
    }

    void inorder(Node* n, std::vector<K>& out) const {
        if (!n) return;
        inorder(n->left, out);
        out.push_back(n->key);
        inorder(n->right, out);
    }

public:
    EphemeralRBTree() : root(nullptr) {}

    ~EphemeralRBTree() {
        destroy(root);
    }

    EphemeralRBTree(const EphemeralRBTree&) = delete;
    EphemeralRBTree& operator=(const EphemeralRBTree&) = delete;

    std::optional<V> get(const K& key) const {
        Node* curr = root;
        while (curr) {
            if (key < curr->key) curr = curr->left;
            else if (curr->key < key) curr = curr->right;
            else return curr->value;
        }
        return std::nullopt;
    }

    void insert(K key, V value) {
        Node* parent = nullptr;
        Node* curr = root;
        while (curr) {
            parent = curr;
            if (key < curr->key) curr = curr->left;
            else if (curr->key < key) curr = curr->right;
            else {
                curr->value = std::move(value);
                return;
            }
        }
        Node* fresh = new Node(std::move(key), std::move(value), Color::RED);
        fresh->parent = parent;
        if (!parent) root = fresh;
        else if (fresh->key < parent->key) parent->left = fresh;
        else parent->right = fresh;
        fix_insert(fresh);
    }

    std::vector<K> keys() const {
        std::vector<K> out;
        inorder(root, out);
        return out;
    }
};

#endif
