Performance analysis

Ran performance.js, three separate comparisons. Numbers are from one run
each, not averaged across multiple trials, so treat the small-size ones
especially with a grain of salt (JIT warm-up alone can swing a 0-5ms
measurement quite a bit).

1. Persistent (keeping every version alive) vs ephemeral, insert time and
memory:

size    persistent(ms)  ephemeral(ms)  persistent MB  ephemeral MB
1000    6.6             2.9            0.68           0.08
5000    18.3            6.9            3.96           0.35
20000   47.9            26.2           18.34          1.40
50000   233.9           63.3           50.01          0.02

The ephemeral memory number at 50k (0.02 MB) is basically noise -
process.memoryUsage() before/after a forced gc() isn't a clean enough
signal to trust at that scale, other allocations in the process muddy it
(the 20k row shows 1.40 MB for the same tree type, which is the more
believable reading and just underlines how noisy this measurement is).
What's real and expected here is the growth pattern on the persistent
side: memory scales with total nodes ever allocated across all kept
versions, and since I'm holding a reference to every intermediate version
in the versions array, that's O(n log n) node allocations total for n
inserts (each insert only touches O(log n) nodes on its path). Time-wise
the persistent tree is doing noticeably more work at larger sizes -
close to 4x slower than ephemeral at 50k - which lines up with it
allocating new nodes on every insert path instead of just following
pointers and mutating.

Worth being honest that this isn't really a fair fight as framed: the
ephemeral tree throws away its history, the persistent one is deliberately
keeping 50000 old versions alive at once, which is a much heavier
workload by construction. A more apples-to-apples comparison would keep
only the persistent tree's *current* version reachable and let the GC
clean up the rest, same as ephemeral effectively does. Didn't have time
to rerun with that setup, noting it here instead.

2. Persistent vs naive-full-deep-copy - this is the comparison that
actually shows why path copying is worth doing:

size    persistent(ms)  naive-copy(ms)  persistent MB  naive-copy MB
200     0.0             2.1             0.10           0.00
1000    0.3             225.2           0.64           0.08
3000    1.0             103.0           2.25           0.24

Naive copy clones the entire tree (every single node) before each insert,
so its cost per operation is O(n) regardless of where in the tree the
change happens. That's why it blows up so fast - at 1000 keys it's
already around 700x slower than path copying for the same sequence of
inserts (the 3000-key row looking "better" than the 1000-key row is
probably GC pausing mid-run rather than the naive version actually
getting faster - this benchmark isn't set up to isolate that cleanly).
Path copying only touches the O(log n) nodes on the root-to-leaf path,
everything else gets reused. The naive-copy memory numbers looking low is
again a measurement artifact - it's actually allocating a full tree's
worth of nodes on every single call, that's not free, the methodology
just isn't catching it since only the final tree stays reachable and
everything else gets collected mid-run.

3. Search, single version, 10k lookups after building the tree:

size    persistent(ms/10k)  ephemeral(ms/10k)
1000    1.8                 3.9
5000    1.1                 2.5
20000   1.9                 2.1
50000   3.1                 3.5

Search is close between the two, which makes sense - once a version is
built, walking it is the same O(log n) comparison-by-comparison descent
either way, immutability doesn't cost anything extra at read time.
Persistent search is a bit faster than ephemeral across the board here,
which I wasn't expecting; possibly the ephemeral tree's parent pointers
(extra field per node, needed for the rotation logic) make each node
slightly bigger and marginally worse for cache behavior, but that's a
guess, not something I actually measured.

Bottom line: path copying gets you real persistence at a cost that's
close to ephemeral for the actual tree structure (each op still O(log n)
node allocations), and it's dramatically cheaper than the "just clone
everything" alternative once the tree has any real size to it. The
tradeoff you're actually paying is retained memory if you keep old
versions alive on purpose, which is the point of the data structure, not
a flaw in it.
