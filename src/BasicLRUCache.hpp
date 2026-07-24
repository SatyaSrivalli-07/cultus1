#ifndef BASIC_LRU_CACHE_HPP
#define BASIC_LRU_CACHE_HPP

#include <unordered_map>
#include <list>
#include <optional>
#include <utility>
#include <cstddef>
#include <stdexcept>

template <typename K, typename V>
class BasicLRUCache {
public:
    using KeyValue = std::pair<K, V>;
    using ListType = std::list<KeyValue>;
    using ListIterator = typename ListType::iterator;

    explicit BasicLRUCache(size_t capacity) : capacity_(capacity) {
        if (capacity == 0) {
            throw std::invalid_argument("Capacity must be greater than 0");
        }
    }

    std::optional<V> get(const K& key) {
        auto it = map_.find(key);
        if (it == map_.end()) {
            return std::nullopt;
        }
        items_.splice(items_.begin(), items_, it->second);
        return it->second->second;
    }

    void put(K key, V value) {
        auto it = map_.find(key);
        if (it != map_.end()) {
            it->second->second = std::move(value);
            items_.splice(items_.begin(), items_, it->second);
            return;
        }

        if (items_.size() >= capacity_) {
            auto last = items_.end();
            --last;
            map_.erase(last->first);
            items_.pop_back();
        }

        items_.push_front({key, std::move(value)});
        map_[key] = items_.begin();
    }

    bool remove(const K& key) {
        auto it = map_.find(key);
        if (it == map_.end()) {
            return false;
        }
        items_.erase(it->second);
        map_.erase(it);
        return true;
    }

    size_t size() const {
        return items_.size();
    }

    size_t capacity() const {
        return capacity_;
    }

private:
    size_t capacity_;
    ListType items_;
    std::unordered_map<K, ListIterator> map_;
};

#endif
