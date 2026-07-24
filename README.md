# Persistent Memory-Mapped B+ Tree Implementation (JavaScript)

I implemented a disk-backed B+ Tree index in Node.js using fixed 4096-byte pages and an LRU buffer pool manager. The project serializes nodes directly to binary disk buffers, supporting point lookups, range queries, node splitting, and node deletion.

## Project Structure

- src/DiskManager.js: Manages synchronous 4096-byte binary page reads and writes to disk block files.
- src/BufferPoolManager.js: Implements a page frame cache with LRU eviction policy to control memory footprint.
- src/BPlusTree.js: Implements B+ Tree indexing logic, leaf/internal node splits, and binary node serialization.
- test/bplustree.test.js: Test suite covering point search, leaf splitting, range queries, key updates, deletion, and 500-key buffer pool stress tests.
- performance.js: Benchmark script measuring disk block I/O reads/writes, search latency, and memory heap usage.

## Building and Running

Run unit tests:

```bash
npm test
```

Run performance benchmark:

```bash
npm run bench
```

## Usage Example

```javascript
const path = require('path');
const { DiskManager } = require('./src/DiskManager');
const { BufferPoolManager } = require('./src/BufferPoolManager');
const { BPlusTree } = require('./src/BPlusTree');

const disk = new DiskManager(path.join(__dirname, 'data.db'));
const bpm = new BufferPoolManager(disk, 10);
const tree = new BPlusTree(bpm, 4);

tree.insert(10, 'apple');
tree.insert(20, 'banana');

console.log(tree.search(10));
console.log(tree.search(20));

const range = tree.rangeSearch(10, 20);
console.log(range);

disk.close();
```
