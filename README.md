Persistent Red-Black Tree

A red-black tree where insert and delete never mutate the tree you called
them on. Both return a new tree, and anything that wasn't on the path
from the root down to the change is shared with the old version instead
of being copied. So old snapshots stay valid and readable forever, at a
cost of roughly O(log n) new nodes per operation instead of O(n).

Written in JavaScript (src/PersistentRBTree.js is the main one). There's
also an ordinary mutating red-black tree in src/EphemeralRBTree.js and a
"just deep-copy the whole thing" version in src/NaiveCopyRBTree.js -
those two exist to benchmark against, not because you'd actually want to
use them for anything.

    const { PersistentRBTree } = require('./src/PersistentRBTree');

    let t = new PersistentRBTree();
    t = t.insert(10, 'hello');
    const t2 = t.insert(20, 'world'); // t is untouched, t2 has both keys

    t.get(20);   // undefined
    t2.get(20);  // 'world'

    const t3 = t2.delete(10);
    t2.keys();   // [10, 20] - still fine
    t3.keys();   // [20]

Other stuff on there: get(key), has(key), keys() (sorted), entries(),
size(), and blackHeight() which walks the tree checking the two
red-black invariants and throws if either is broken (used a lot in the
test suite, not something you'd call in normal use).

Tests: node test/rbtree.test.js - 16 assertion-based checks, covers
insertion, all three delete shapes (leaf / one child / two children),
cascading rebalancing, immutability of old versions after later edits,
structural sharing, and a concurrent-async-reads check.

Benchmark: node --expose-gc performance.js - compares insert/search time
and memory across the persistent, ephemeral, and naive-copy
implementations at a few different sizes. Write-up with the actual
numbers and what they mean is in performance-analysis.md.

There's also stress.js, which isn't part of the graded suite - it's a
randomized fuzz test I used while building this to catch bugs the fixed
test cases wouldn't have found (runs 60 different random seeds against a
plain Map as the reference). Left it in since it's genuinely useful if
you're modifying the delete logic.

What's not here: no on-disk persistence (everything lives in memory for
the process lifetime), and "thread safety" is really "the data structure
is immutable so it would be thread-safe in a language with real threads"
- see NOTES.md for the caveat on that, since Node itself is
single-threaded and I can't actually test concurrent memory access here.
