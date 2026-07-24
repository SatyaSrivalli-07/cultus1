const { PersistentRBTree } = require('./src/PersistentRBTree');

function runTrial(seed, ops) {
  let rng = mulberry32(seed);
  let tree = new PersistentRBTree();
  const reference = new Map();
  const snapshots = [];

  for (let i = 0; i < ops; i++) {
    const key = Math.floor(rng() * (ops / 4));
    const doInsert = rng() < 0.6 || reference.size === 0;

    if (doInsert) {
      const value = 'v' + key;
      tree = tree.insert(key, value);
      reference.set(key, value);
    } else {
      const keys = [...reference.keys()];
      const target = keys[Math.floor(rng() * keys.length)];
      tree = tree.delete(target);
      reference.delete(target);
    }

    tree.blackHeight();

    if (i % 37 === 0) {
      snapshots.push({ tree, expected: new Map(reference) });
    }
  }

  const gotKeys = tree.keys();
  const expectedKeys = [...reference.keys()].sort((a, b) => a - b);
  if (JSON.stringify(gotKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`seed ${seed}: key mismatch. got ${gotKeys.length} expected ${expectedKeys.length}`);
  }
  for (const [k, v] of reference) {
    if (tree.get(k) !== v) throw new Error(`seed ${seed}: value mismatch at key ${k}`);
  }

  for (const snap of snapshots) {
    snap.tree.blackHeight();
    const snapKeys = snap.tree.keys();
    const expKeys = [...snap.expected.keys()].sort((a, b) => a - b);
    if (JSON.stringify(snapKeys) !== JSON.stringify(expKeys)) {
      throw new Error(`seed ${seed}: a historical snapshot got mutated`);
    }
    for (const [k, v] of snap.expected) {
      if (snap.tree.get(k) !== v) throw new Error(`seed ${seed}: snapshot value mismatch at key ${k}`);
    }
  }

  return true;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let failures = 0;
for (let seed = 1; seed <= 60; seed++) {
  try {
    runTrial(seed, 800);
  } catch (e) {
    failures++;
    console.log('FAILED seed', seed, '-', e.message);
  }
}
console.log(failures === 0 ? 'all 60 trials passed' : `${failures} trial(s) failed`);
