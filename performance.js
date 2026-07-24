const path = require('path');
const { DiskManager } = require('./src/DiskManager');
const { BufferPoolManager } = require('./src/BufferPoolManager');
const { BPlusTree } = require('./src/BPlusTree');

function heapMB() {
  if (global.gc) global.gc();
  return (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
}

function runBenchmark() {
  const dbPath = path.join(__dirname, 'bench.db');
  const disk = new DiskManager(dbPath);
  const bpm = new BufferPoolManager(disk, 10);
  const tree = new BPlusTree(bpm, 8);

  const sizes = [100, 500, 2000, 5000];

  console.log('=== B+ Tree Performance & Block I/O Metrics ===\n');
  console.log('Keys\tInsert Time(ms)\tSearch Time(ms)\tDisk Reads\tDisk Writes\tHeap (MB)');

  for (const n of sizes) {
    const keys = Array.from({ length: n }, (_, i) => i + 1);
    
    const t0 = process.hrtime.bigint();
    for (const k of keys) {
      tree.insert(k, 'val_' + k);
    }
    const t1 = process.hrtime.bigint();
    const insertMs = (Number(t1 - t0) / 1e6).toFixed(2);

    const t2 = process.hrtime.bigint();
    for (let i = 0; i < 1000; i++) {
      const target = Math.floor(Math.random() * n) + 1;
      tree.search(target);
    }
    const t3 = process.hrtime.bigint();
    const searchMs = (Number(t3 - t2) / 1e6).toFixed(2);

    console.log(`${n}\t${insertMs}\t\t${searchMs}\t\t${disk.diskReads}\t\t${disk.diskWrites}\t\t${heapMB()}`);
  }

  disk.close();
}

runBenchmark();
