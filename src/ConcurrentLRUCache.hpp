#ifndef CONCURRENT_LRU_CACHE_HPP
#define CONCURRENT_LRU_CACHE_HPP

#include <unordered_map>
#include <list>
#include <shared_mutex>
#include <mutex>
#include <optional>
#include <utility>
#include <cstddef>
#include <stdexcept>
#include <vector>
#include <memory>

template <typename K, typename V>
class ConcurrentLRUCache {
public:
    using KeyValue = std::pair<K, V>;
    using ListType = std::list<KeyValue>;
    using ListIterator = typename ListType::iterator;

    explicit ConcurrentLRUCache(size_t capacity) : capacity_(capacity) {
        if (capacity == 0) {
            throw std::invalid_argument("Capacity must be greater than 0");
        }
    }

    std::optional<V> get(const K& key) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        auto it = map_.find(key);
        if (it == map_.end()) {
            return std::nullopt;
        }
        items_.splice(items_.begin(), items_, it->second);
        return it->second->second;
    }

    bool contains(const K& key) const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return map_.find(key) != map_.end();
    }

    void put(K key, V value) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
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
        std::unique_lock<std::shared_mutex> lock(mutex_);
        auto it = map_.find(key);
        if (it == map_.end()) {
            return false;
        }
        items_.erase(it->second);
        map_.erase(it);
        return true;
    }

    size_t size() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return items_.size();
    }

    size_t capacity() const {
        return capacity_;
    }

    void clear() {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        map_.clear();
        items_.clear();
    }

private:
    size_t capacity_;
    ListType items_;
    std::unordered_map<K, ListIterator> map_;
    mutable std::shared_mutex mutex_;
};

template <typename K, typename V>
class SegmentedLRUCache {
public:
    SegmentedLRUCache(size_t total_capacity, size_t num_segments = 16)
        : num_segments_(num_segments) {
        if (total_capacity == 0 || num_segments == 0) {
            throw std::invalid_argument("Capacity and segments must be greater than 0");
        }
        size_t seg_cap = (total_capacity + num_segments - 1) / num_segments;
        for (size_t i = 0; i < num_segments; ++i) {
            segments_.push_back(std::make_unique<ConcurrentLRUCache<K, V>>(seg_cap));
        }
    }

    std::optional<V> get(const K& key) {
        return get_segment(key).get(key);
    }

    void put(K key, V value) {
        get_segment(key).put(std::move(key), std::move(value));
    }

    bool remove(const K& key) {
        return get_segment(key).remove(key);
    }

    size_t size() const {
        size_t total = 0;
        for (const auto& seg : segments_) {
            total += seg->size();
        }
        return total;
    }

private:
    size_t num_segments_;
    std::vector<std::unique_ptr<ConcurrentLRUCache<K, V>>> segments_;

    ConcurrentLRUCache<K, V>& get_segment(const K& key) {
        size_t hash_val = std::hash<K>{}(key);
        return *segments_[hash_val % num_segments_];
    }

    const ConcurrentLRUCache<K, V>& get_segment(const K& key) const {
        size_t hash_val = std::hash<K>{}(key);
        return *segments_[hash_val % num_segments_];
    }
};

#endif
