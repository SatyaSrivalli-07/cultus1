const { PersistentRBTree } = require('./src/PersistentRBTree');
const { EphemeralRBTree } = require('./src/EphemeralRBTree');
const { NaiveCopyRBTree } = require('./src/NaiveCopyRBTree');

const sizes = [1000, 5000, 20000, 50000];

function shuffledInts(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function heapMB() {
  if (global.gc) global.gc();
  return process.memoryUsage().heapUsed / (1024 * 1024);
}

function benchInsertPersistent(keys) {
  const before = heapMB();
  const t0 = process.hrtime.bigint();
  let t = new PersistentRBTree();
  const versions = [];
  for (const k of keys) {
    t = t.insert(k, k);
    versions.push(t);
  }
  const t1 = process.hrtime.bigint();
  const after = heapMB();
  return { ms: Number(t1 - t0) / 1e6, mb: after - before, versionsKept: versions.length, finalTree: t };
}

function benchInsertEphemeral(keys) {
  const before = heapMB();
  const t0 = process.hrtime.bigint();
  const t = new EphemeralRBTree();
  for (const k of keys) t.insert(k, k);
  const t1 = process.hrtime.bigint();
  const after = heapMB();
  return { ms: Number(t1 - t0) / 1e6, mb: after - before };
}

function benchInsertNaive(keys, cap) {
  const before = heapMB();
  const t0 = process.hrtime.bigint();
  let t = new NaiveCopyRBTree();
  for (let i = 0; i < cap; i++) {
    t = t.insert(keys[i], keys[i]);
  }
  const t1 = process.hrtime.bigint();
  const after = heapMB();
  return { ms: Number(t1 - t0) / 1e6, mb: after - before, ranOn: cap };
}

console.log('=== Insert throughput & memory: persistent (keeping every version) vs ephemeral ===\n');
console.log('size\tpersistent(ms)\tephemeral(ms)\tpersistent MB\tephemeral MB');
for (const n of sizes) {
  const keys = shuffledInts(n);
  const p = benchInsertPersistent(keys);
  const e = benchInsertEphemeral(keys);
  console.log(`${n}\t${p.ms.toFixed(1)}\t\t${e.ms.toFixed(1)}\t\t${p.mb.toFixed(2)}\t\t${e.mb.toFixed(2)}`);
}

console.log('\n=== Persistent (path-copying) vs naive full-deep-copy, small sizes only ===\n');
console.log('size\tpersistent(ms)\tnaive-copy(ms)\tpersistent MB\tnaive-copy MB');
const naiveSizes = [200, 1000, 3000];
for (const n of naiveSizes) {
  const keys = shuffledInts(n);
  const p = benchInsertPersistent(keys);
  const naive = benchInsertNaive(keys, n);
  console.log(`${n}\t${p.ms.toFixed(1)}\t\t${naive.ms.toFixed(1)}\t\t${p.mb.toFixed(2)}\t\t${naive.mb.toFixed(2)}`);
}

console.log('\n=== Search, single version, after building each tree ===\n');
console.log('size\tpersistent search(ms/10k)\tephemeral search(ms/10k)');
for (const n of sizes) {
  const keys = shuffledInts(n);
  let pt = new PersistentRBTree();
  const et = new EphemeralRBTree();
  for (const k of keys) { pt = pt.insert(k, k); et.insert(k, k); }

  const lookups = [];
  for (let i = 0; i < 10000; i++) lookups.push(Math.floor(Math.random() * n * 1.2));

  const ps = process.hrtime.bigint();
  for (const k of lookups) pt.get(k);
  const pe = process.hrtime.bigint();

  const es = process.hrtime.bigint();
  for (const k of lookups) et.get(k);
  const ee = process.hrtime.bigint();

  console.log(`${n}\t${(Number(pe - ps) / 1e6).toFixed(1)}\t\t\t${(Number(ee - es) / 1e6).toFixed(1)}`);
}
