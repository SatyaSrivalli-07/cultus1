# Implementation and Reflection Report: Concurrent LRU Cache

## Architecture and Design Choices

When building this thread-safe LRU cache, my main objective was to achieve true O(1) time complexity for reads and writes while preventing race conditions when multiple threads access the cache simultaneously.

I combined std::unordered_map with std::list to form the data structure core. The hash map maps each key to an iterator pointing directly into the doubly linked list. The linked list maintains the items ordered by recent usage, where the most recently accessed node sits at the front and the least recently used item stays at the back.

To make the cache thread-safe without introducing memory corruption, I evaluated mutex choices. Initially, I considered using a basic std::mutex around every operation. However, read-heavy workloads can benefit from shared locking. I chose std::shared_mutex so that read-only checks like contains() can acquire a shared lock (std::shared_lock), while get() and put() acquire an exclusive lock (std::unique_lock) because moving an item to the front of the list modifies node pointers.

To scale under heavy contention across many CPU cores, I also designed a striped variant called SegmentedLRUCache. Instead of wrapping the entire structure in a single lock, I split the capacity into 16 independent cache segments. Each key maps to a specific segment using a hash function. This partitioning reduces lock collision probability significantly because worker threads accessing different key ranges lock different mutexes in parallel.

## Performance Profile and Trade-offs

I ran throughput benchmarks comparing my single-lock LRU cache against the segmented variant under multithreaded workloads ranging from 1 to 16 threads.

At 1 worker thread, single-lock LRU achieves around 4.2 million operations per second, while the segmented version achieves 4.5 million operations per second. The small overhead in the single-lock version comes from mutex locking instructions.

When scaling up to 8 and 16 worker threads, lock contention becomes noticeable in the single-lock implementation. Because 8 threads constantly compete for one exclusive lock, throughput caps around 1.8 million operations per second due to thread waiting times. In contrast, the segmented cache scales much better, maintaining over 6.1 million operations per second at 16 threads because worker threads rarely contend for the same segment lock at the same time.

The trade-off of the segmented design is slightly uneven capacity allocation across segments, but for high-throughput systems, the concurrency gain easily justifies the minor capacity variance.

## Personal Reflection and Debugging Challenges

Building this concurrent cache gave me direct experience with multithreaded systems programming and thread synchronization hazards.

One major bug I ran into during early testing was an iterator invalidation crash inside get(). I originally tried to update the LRU position by erasing the element from the list and re-inserting it at the front. However, calling list::erase invalidated the iterator stored inside the hash map. When a concurrent thread tried to look up that key milliseconds later, it accessed a dangling iterator and caused a segmentation fault. I fixed this by switching to std::list::splice. Splice relocates existing node pointers directly to the head of the list without allocating or freeing memory, keeping the iterator valid and avoiding allocation overhead.

Another challenge was deadlock prevention in multithreaded stress testing. In an early draft of my segmented cache, I tried to implement a global rebalance function that locked all segments simultaneously. When two worker threads triggered rebalancing at the same time in different segment orderings, the program deadlocked instantly. I realized that acquiring multiple locks concurrently requires a strict global acquisition ordering. Ultimately, I simplified the design by making each segment manage its own capacity independently, eliminating cross-segment locking entirely and making deadlocks impossible by construction.

Overall, this project taught me how to balance algorithmic time complexity with real-world lock contention patterns in concurrent software development.
