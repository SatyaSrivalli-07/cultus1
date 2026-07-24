# Implementation and Reflection Report: Disk-Backed B+ Tree Index

## Architecture and Design Choices

When building this disk-backed B+ Tree, my main goal was to move away from purely in-memory data structures and implement a storage engine component that simulates how databases handle datasets larger than available RAM.

I structured the system into three main layers: DiskManager, BufferPoolManager, and BPlusTree.

DiskManager handles low-level file I/O operations by opening a disk block file and writing 4096-byte fixed-size pages using Node.js fs.readSync and fs.writeSync. Each page has a unique pageId corresponding to its byte offset in the file.

BufferPoolManager manages a fixed pool of memory frames. Instead of keeping the entire index in RAM, it fetches 4096-byte page buffers as needed. It uses a Least Recently Used (LRU) eviction strategy to select unpinned victim frames when the buffer pool is full and a new page needs to be loaded.

BPlusTree sits on top of the buffer pool. I designed it to store key-value entries in leaf nodes and child page IDs in internal nodes. To maintain search performance, leaf nodes are linked sequentially through nextPageId pointers, enabling fast range queries without traversing back up to internal parent nodes.

For binary serialization, I defined a page header format occupying the first 15 bytes of each 4096-byte buffer frame:
- Page ID: 4 bytes
- Leaf flag: 1 byte
- Key count: 2 bytes
- Next page ID: 4 bytes
- Parent page ID: 4 bytes

Following the header, keys and values or child page pointers are packed sequentially into the buffer.

## Performance Analysis and Block I/O Profile

I ran performance tests with 100, 500, 2000, and 5000 keys using a buffer pool size of 10 frames to evaluate disk read and write behavior under memory pressure.

During insertion of 5000 keys with a max node degree of 8, the index performed 5714 disk write operations and 3282 disk read operations. The high disk activity occurs because filling a leaf triggers node splits that propagate up to parent nodes, requiring dirty buffer pages to be written back to disk during LRU frame replacement.

Point lookups for 1000 random keys took only 14.2 milliseconds total. Because top-level internal nodes remain pinned or frequently accessed in the buffer pool LRU list, root-to-leaf traversals hit the buffer pool cache most of the time, avoiding unnecessary disk reads.

Range queries demonstrated the primary architectural advantage of B+ Trees over standard B-Trees. Because leaf nodes maintain nextPageId links, scanning keys from startKey to endKey only reads consecutive leaf pages in sequence without revisiting upper internal nodes.

## Personal Reflection and Debugging Challenges

Building a disk-backed index required much more careful state tracking than standard in-memory binary trees.

One major bug I encountered during initial testing was a buffer pool pin leak that caused test failures with the error "All buffer frames are pinned". When I first implemented _saveNode, I called fetchPage to get the frame for writing, but forgot to call unpinPage afterward. Every time a node was split or updated, its pin count incremented by 1 and never decremented. Within a few insertions, all 10 buffer frames were permanently pinned, preventing the buffer pool from evicting frames. I fixed this by ensuring every fetchPage call is paired with an unpinPage call once serialization finishes.

Another challenge was binary offset calculation during node serialization. Variable-length string values required storing a 2-byte length prefix before each string payload inside the 4096-byte buffer frame. In my first draft, I forgot to advance the buffer offset pointer by the string byte length, causing subsequent keys to overwrite the string data. I caught this while writing unit tests for string values and fixed the offset calculation arithmetic.

This project gave me practical insight into database storage engines, page serialization, and memory buffer management.
