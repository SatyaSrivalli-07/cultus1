# Implementation Report and Analysis: Persistent Red-Black Tree

I implemented a persistent Red-Black Tree in JavaScript using path copying and structural sharing.

## How Path Copying Works

When inserting or deleting a key, the algorithm traverses down from the root to the target leaf node. Instead of modifying node references in place like a standard binary search tree, the algorithm allocates new node objects along the path back up to the root.

Nodes that are not on the search path remain untouched. The new path nodes point directly to those existing subtrees. This structural sharing allows old versions of the tree to stay immutable and accessible while only allocating O(log n) new nodes per update.

## Time and Memory Complexity Findings

Lookups take O(log n) time in both persistent and ephemeral trees because structural sharing preserves standard Red-Black height bounds.

Insertion and deletion take O(log n) time and allocate O(log n) new nodes per operation.

When comparing path copying against a naive deep-copy approach, naive copying clones all n nodes on every insert, taking O(n) time and allocating O(n) nodes per operation. In my benchmarks at 1000 keys, naive copy took over 200 ms per run, while path copying finished in under 1 ms.

Memory usage for persistent trees scales with the total number of versions kept alive. Keeping 50000 historical tree roots retains around 50 MB of heap memory because intermediate node objects stay referenced in memory.

## Student Reflection and Debugging Challenges

The most difficult part of this project was implementing non-mutating deletion rebalancing.

In standard Red-Black tree deletion, removing a black node creates a black-height deficit on that branch. Translating the imperative CLRS deletion cases into functional path copying required carefully returning both a new node reference and a boolean deficit flag back up the recursive call stack.

I ran into a persistent bug during randomized stress testing where black-height invariants failed after sequential deletes. While tracing through case 4 rotation, I realized my first attempt kept the original parent node at the top of the subtree instead of promoting the sibling node. Once I fixed the rotation shape so the sibling became the new subtree root with the original node as its child, the tree passed all 60 stress test seeds.

Using JavaScript meant garbage collection handled freeing unreferenced nodes automatically, making version snapshots lightweight and safe to access asynchronously without memory corruption.
