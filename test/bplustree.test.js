const assert = require('assert');
const path = require('path');
const { DiskManager } = require('../src/DiskManager');
const { BufferPoolManager } = require('../src/BufferPoolManager');
const { BPlusTree } = require('../src/BPlusTree');

let passed = 0;
let failed = 0;

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

function cleanup(diskManager) {
  if (diskManager) {
    diskManager.close();
  }
}

function runTests() {
  test('insert and point search round trip', () => {
    const dbPath = path.join(__dirname, 'test1.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 5);
    const tree = new BPlusTree(bpm, 4);

    tree.insert(10, 'ten');
    tree.insert(5, 'five');
    tree.insert(20, 'twenty');

    assert.strictEqual(tree.search(10), 'ten');
    assert.strictEqual(tree.search(5), 'five');
    assert.strictEqual(tree.search(20), 'twenty');
    assert.strictEqual(tree.search(999), undefined);

    cleanup(disk);
  });

  test('updating existing key value', () => {
    const dbPath = path.join(__dirname, 'test2.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 5);
    const tree = new BPlusTree(bpm, 4);

    tree.insert(1, 'alpha');
    tree.insert(1, 'beta');

    assert.strictEqual(tree.search(1), 'beta');

    cleanup(disk);
  });

  test('leaf split and multi-level tree creation', () => {
    const dbPath = path.join(__dirname, 'test3.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 5);
    const tree = new BPlusTree(bpm, 3);

    for (let i = 1; i <= 20; i++) {
      tree.insert(i, 'val_' + i);
    }

    for (let i = 1; i <= 20; i++) {
      assert.strictEqual(tree.search(i), 'val_' + i);
    }

    cleanup(disk);
  });

  test('range search query across leaf pages', () => {
    const dbPath = path.join(__dirname, 'test4.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 5);
    const tree = new BPlusTree(bpm, 3);

    for (let i = 1; i <= 30; i++) {
      tree.insert(i, 'v' + i);
    }

    const range = tree.rangeSearch(10, 15);
    const keys = range.map(r => r.key);
    assert.deepStrictEqual(keys, [10, 11, 12, 13, 14, 15]);

    cleanup(disk);
  });

  test('deletion of existing key', () => {
    const dbPath = path.join(__dirname, 'test5.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 5);
    const tree = new BPlusTree(bpm, 3);

    tree.insert(10, 'ten');
    tree.insert(20, 'twenty');
    assert.strictEqual(tree.delete(10), true);
    assert.strictEqual(tree.search(10), undefined);
    assert.strictEqual(tree.search(20), 'twenty');

    cleanup(disk);
  });

  test('stress test with 500 keys and small buffer pool', () => {
    const dbPath = path.join(__dirname, 'test6.db');
    const disk = new DiskManager(dbPath);
    const bpm = new BufferPoolManager(disk, 4);
    const tree = new BPlusTree(bpm, 4);

    const keys = [];
    for (let i = 0; i < 500; i++) {
      keys.push(Math.floor(Math.random() * 10000));
    }

    keys.forEach(k => tree.insert(k, 'data_' + k));
    bpm.flushAll();

    const uniqueKeys = [...new Set(keys)];
    uniqueKeys.forEach(k => {
      assert.strictEqual(tree.search(k), 'data_' + k);
    });

    cleanup(disk);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

runTests();
