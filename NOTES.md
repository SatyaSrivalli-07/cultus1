Notes on the persistent red-black tree

Went with JavaScript for this even though the brief suggested a systems
language (C++/Rust/Java). Worth being upfront about that: JS has a garbage
collector doing the memory reclamation for you, so the "old versions get
freed once nothing references them anymore" behavior you'd have to build
by hand in C++ (or lean on Rc/Arc for in Rust) is just... there already.
That's a real gap versus what the assignment is actually testing for. What
I can still demonstrate properly in JS is the algorithmic core: path
copying, structural sharing, and the fact that old roots stay valid
forever. That part doesn't depend on the host language.

How insert works

Standard Okasaki approach. Insert walks down like a normal BST insert,
building new nodes on the way back up instead of mutating in place, and a
balance() function catches the four red-red violation shapes right after
each node gets rebuilt. If a node wasn't touched by the insert path it
just gets reused - same object, same reference, nothing new allocated for
it. That's where all the memory savings come from versus copying the
whole tree.

Delete is the hard part

Okasaki's original paper punts on functional deletion (leaves it as an
exercise), so I ended up writing this the way you'd translate the
imperative CLRS fixup into a form that returns new nodes instead of
mutating existing ones. The core idea: _del recurses down, and on the way
back up, if the black-height of the subtree it just returned is one
short of where it should be (I'm calling this "deficit" in the code
rather than the double-black terminology some papers use, felt clearer),
the parent has to do one of four standard rebalancing moves before it can
return cleanly.

The four cases, roughly:
1. sibling is red -> rotate to make the sibling black, then you're
   guaranteed to land in one of cases 2-4 one level down
2. sibling and both its kids are black -> recolor sibling red, deficit
   either gets absorbed here (if this node was red) or bubbles up
3. sibling's near-side kid is red, far-side is black -> rotate to flip
   which side the red is on, falls into case 4
4. sibling's far-side kid is red -> one rotation and you're done, no
   further propagation needed

Getting case 4 right took a couple of tries - the rotation needs the
sibling to end up as the new top of that subtree with the original node
dropping down as its child, not the other way around. First draft had
that backwards and it passed the easy tests but broke under randomized
stress testing (a node with 5000+ random insert/delete ops kept failing
black-height checks). Fixed once I actually traced through what CLRS's
LEFT-ROTATE does to the parent/child relationship.

Two-children delete just promotes the in-order successor's key/value up
and recursively deletes the successor (which by definition has at most
one child) from the right subtree. Nothing fancy there.

Testing approach

Wrote a stress-test script (stress.js, not part of the graded test suite,
just what I used to find bugs) that runs random sequences of
insert/delete against both the tree and a plain Map, checking after every
single operation that: no red node has a red child, every root-to-leaf
path has the same black count, and the sorted key list matches the Map
exactly. Also periodically snapshots the tree mid-run and checks it later
that those older snapshots never change after more operations happen on
the current version - that's the actual persistence guarantee, not just
"insert/delete work correctly."

Ran that for 60 different seeds at both 800 ops and 5000 ops before
trusting the implementation enough to write the real test suite around
it.

Concurrent-read safety

There's no real multithreading in Node, so I can't test what the
assignment is probably actually asking about (shared mutable memory
across OS threads). What I can show, and what's included in the test
suite, is that firing off a pile of interleaved async reads against
different historical versions never gives back the wrong answer for the
version being read - because nothing is mutated, there's no lock needed
and no read can ever observe a half-updated node. In a real multithreaded
language this same property (immutable nodes, new roots instead of
in-place edits) is what makes persistent structures safe to read from
multiple threads without synchronization. Just can't demonstrate the
actual thread part here.

Things I'd do differently with more time

- Real memory-overhead measurement is hard to get clean numbers for in JS
  because of GC timing - the perf script calls global.gc() before each
  measurement but there's still some noise, especially at smaller sizes.
- No batch/bulk insert operation, everything goes through single insert()
  calls even in the benchmark.
- Delete's "case 1" recursion allocates one extra wrapper node that gets
  immediately replaced - not wrong, just not maximally efficient.
