const assert = require('assert');
const { PersistentRBTree } = require('../src/PersistentRBTree');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`PASS - ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL - ${name}`);
    console.log('  ' + err.message);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`PASS - ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL - ${name}`);
    console.log('  ' + err.message);
    failed++;
  }
}

async function main() {

test('insert then get round-trips values', () => {
  let t = new PersistentRBTree();
  t = t.insert(10, 'ten').insert(5, 'five').insert(20, 'twenty');
  assert.strictEqual(t.get(10), 'ten');
  assert.strictEqual(t.get(5), 'five');
  assert.strictEqual(t.get(20), 'twenty');
  assert.strictEqual(t.get(999), undefined);
});

test('overwriting a key updates value without changing size', () => {
  let t = new PersistentRBTree().insert(1, 'a');
  t = t.insert(1, 'b');
  assert.strictEqual(t.get(1), 'b');
  assert.strictEqual(t.size(), 1);
});

test('insert never mutates the tree it was called on', () => {
  const t1 = new PersistentRBTree().insert(1, 'a').insert(2, 'b');
  const t2 = t1.insert(3, 'c');
  assert.deepStrictEqual(t1.keys(), [1, 2]);
  assert.deepStrictEqual(t2.keys(), [1, 2, 3]);
});

test('delete never mutates the tree it was called on', () => {
  const t1 = new PersistentRBTree().insert(1, 'a').insert(2, 'b').insert(3, 'c');
  const t2 = t1.delete(2);
  assert.deepStrictEqual(t1.keys(), [1, 2, 3]);
  assert.deepStrictEqual(t2.keys(), [1, 3]);
});

test('unmodified subtrees are shared by reference across versions', () => {
  let t = new PersistentRBTree();
  for (let k = 0; k < 15; k++) t = t.insert(k, 'v' + k);
  const before = t;
  const after = t.insert(1000, 'far away');
  assert.ok(before.root.left === after.root.left || before.root === after.root.left,
    'expected some shared subtree reference between versions');
});

test('older snapshots survive a long chain of later inserts and deletes', () => {
  const snapshots = [];
  let t = new PersistentRBTree();
  for (let k = 0; k < 200; k++) {
    t = t.insert(k, 'v' + k);
    if (k % 20 === 0) snapshots.push({ tree: t, upTo: k });
  }
  for (let k = 0; k < 100; k += 3) t = t.delete(k);

  for (const snap of snapshots) {
    const expected = [];
    for (let k = 0; k <= snap.upTo; k++) expected.push(k);
    assert.deepStrictEqual(snap.tree.keys(), expected, `snapshot at k=${snap.upTo} changed after later edits`);
  }
});

test('500 random inserts stay in sorted order and pass all RB invariants', () => {
  let t = new PersistentRBTree();
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const k = Math.floor(Math.random() * 5000);
    seen.add(k);
    t = t.insert(k, k * 2);
  }
  assert.deepStrictEqual(t.keys(), [...seen].sort((a, b) => a - b));
  t.blackHeight();
});

test('deleting a leaf removes exactly that key', () => {
  let t = new PersistentRBTree();
  [10, 5, 15, 3, 7].forEach(k => t = t.insert(k, k));
  t = t.delete(3);
  assert.strictEqual(t.get(3), undefined);
  assert.deepStrictEqual(t.keys(), [5, 7, 10, 15]);
  t.blackHeight();
});

test('deleting a node with two children promotes the successor', () => {
  let t = new PersistentRBTree();
  for (let k = 1; k <= 15; k++) t = t.insert(k, k * 10);
  t = t.delete(8);
  assert.strictEqual(t.get(8), undefined);
  assert.deepStrictEqual(t.keys(), [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]);
  t.blackHeight();
});

test('deleting causes cascading rebalancing without breaking invariants', () => {
  let t = new PersistentRBTree();
  for (let k = 0; k < 100; k++) t = t.insert(k, k);
  for (let k = 0; k < 90; k++) {
    t = t.delete(k);
    t.blackHeight();
  }
  assert.deepStrictEqual(t.keys(), [90, 91, 92, 93, 94, 95, 96, 97, 98, 99]);
});

test('deleting a key that is not present leaves the tree unchanged', () => {
  let t = new PersistentRBTree().insert(1, 'a').insert(2, 'b');
  const t2 = t.delete(999);
  assert.deepStrictEqual(t2.keys(), [1, 2]);
});

test('deleting everything empties the tree cleanly', () => {
  let t = new PersistentRBTree();
  const keys = [15, 3, 42, 8, 23, 4, 16, 99, 1, 7, 55, 29];
  keys.forEach(k => t = t.insert(k, k));
  keys.forEach(k => t = t.delete(k));
  assert.deepStrictEqual(t.keys(), []);
  assert.strictEqual(t.root, null);
});

test('root is always black after insert or delete', () => {
  let t = new PersistentRBTree();
  for (let k = 0; k < 50; k++) {
    t = t.insert(Math.floor(Math.random() * 200), k);
    assert.ok(t.root === null || t.root.color === 'B');
  }
  for (let k = 0; k < 20; k++) {
    const keys = t.keys();
    if (keys.length === 0) break;
    t = t.delete(keys[Math.floor(Math.random() * keys.length)]);
    assert.ok(t.root === null || t.root.color === 'B');
  }
});

test('no red node ever has a red child, across 300 mixed operations', () => {
  let t = new PersistentRBTree();
  for (let i = 0; i < 300; i++) {
    const k = Math.floor(Math.random() * 150);
    if (Math.random() < 0.6 || t.size() === 0) {
      t = t.insert(k, i);
    } else {
      const keys = t.keys();
      t = t.delete(keys[Math.floor(Math.random() * keys.length)]);
    }
    t.blackHeight();
  }
});

await asyncTest('concurrent reads across multiple historical versions never interleave or corrupt', async () => {
  let versions = [];
  let t = new PersistentRBTree();
  for (let k = 0; k < 50; k++) {
    t = t.insert(k, 'v' + k);
    versions.push(t);
  }
  const checks = [];
  for (let i = 0; i < 500; i++) {
    const vIdx = Math.floor(Math.random() * versions.length);
    const version = versions[vIdx];
    checks.push(new Promise(resolve => {
      setTimeout(() => {
        const ok = version.get(vIdx) === 'v' + vIdx && version.get(vIdx + 1) === undefined;
        resolve(ok);
      }, Math.floor(Math.random() * 5));
    }));
  }
  const results = await Promise.all(checks);
  assert.ok(results.every(r => r === true), 'some concurrent read saw an inconsistent version');
});

test('constructor produces an empty tree', () => {
  const t = new PersistentRBTree();
  assert.deepStrictEqual(t.keys(), []);
  assert.strictEqual(t.size(), 0);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;

}

main();
