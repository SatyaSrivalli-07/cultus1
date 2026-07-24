# Persistent Red-Black Tree

I built a persistent Red-Black Tree in JavaScript. Insert and delete methods never mutate the original tree object. Instead they return a new root pointer and reuse unmodified subtrees from older versions through path copying.

## Project Files

- src/PersistentRBTree.js: Main persistent Red-Black Tree implementation using path copying.
- src/EphemeralRBTree.js: Standard mutating Red-Black Tree baseline.
- src/NaiveCopyRBTree.js: Deep copy baseline that clones every node on update.
- test/rbtree.test.js: Test suite covering insertions, deletions, structural sharing, and invariants.
- stress.js: Randomized fuzz test script running 60 seeds against JavaScript Map reference.
- performance.js: Benchmark script measuring latency and heap usage.

## Running Tests and Benchmarks

Run unit tests:

```bash
npm test
```

Run stress fuzz tests:

```bash
npm run stress
```

Run benchmarks:

```bash
npm run bench
```

## Quick Example

```javascript
const { PersistentRBTree } = require('./src/PersistentRBTree');

let t1 = new PersistentRBTree();
t1 = t1.insert(10, 'apple');

let t2 = t1.insert(20, 'banana');

console.log(t1.get(20));
console.log(t2.get(20));
```
