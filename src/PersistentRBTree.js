function node(color, left, key, value, right) {
  return { color, left, key, value, right };
}

function recolor(n, color) {
  if (n === null) return null;
  return node(color, n.left, n.key, n.value, n.right);
}

function balanceInsert(color, left, key, value, right) {
  if (color === 'B') {
    if (isRed(left) && isRed(left.left)) {
      return node('R', recolor(left.left, 'B'), left.key, left.value,
        node('B', left.right, key, value, right));
    }
    if (isRed(left) && isRed(left.right)) {
      return node('R', node('B', left.left, left.key, left.value, left.right.left),
        left.right.key, left.right.value,
        node('B', left.right.right, key, value, right));
    }
    if (isRed(right) && isRed(right.left)) {
      return node('R', node('B', left, key, value, right.left.left),
        right.left.key, right.left.value,
        node('B', right.left.right, right.key, right.value, right.right));
    }
    if (isRed(right) && isRed(right.right)) {
      return node('R', node('B', left, key, value, right.left),
        right.key, right.value,
        recolor(right.right, 'B'));
    }
  }
  return node(color, left, key, value, right);
}

function isRed(n) {
  return n !== null && n.color === 'R';
}

class PersistentRBTree {
  constructor(root = null) {
    this.root = root;
  }

  get(key) {
    let n = this.root;
    while (n !== null) {
      if (key < n.key) n = n.left;
      else if (key > n.key) n = n.right;
      else return n.value;
    }
    return undefined;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  insert(key, value) {
    const newRoot = recolor(this._ins(this.root, key, value), 'B');
    return new PersistentRBTree(newRoot);
  }

  _ins(n, key, value) {
    if (n === null) return node('R', null, key, value, null);
    if (key < n.key) return balanceInsert(n.color, this._ins(n.left, key, value), n.key, n.value, n.right);
    if (key > n.key) return balanceInsert(n.color, n.left, n.key, n.value, this._ins(n.right, key, value));
    return node(n.color, n.left, key, value, n.right);
  }

  delete(key) {
    if (!this.has(key)) return this;
    const { node: newRoot } = this._del(this.root, key);
    return new PersistentRBTree(newRoot ? recolor(newRoot, 'B') : null);
  }

  _del(n, key) {
    if (key < n.key) {
      const { node: newLeft, deficit } = this._del(n.left, key);
      const merged = node(n.color, newLeft, n.key, n.value, n.right);
      return deficit ? fixDeficitLeft(merged) : { node: merged, deficit: false };
    }
    if (key > n.key) {
      const { node: newRight, deficit } = this._del(n.right, key);
      const merged = node(n.color, n.left, n.key, n.value, newRight);
      return deficit ? fixDeficitRight(merged) : { node: merged, deficit: false };
    }

    if (n.left === null && n.right === null) {
      if (n.color === 'R') return { node: null, deficit: false };
      return { node: null, deficit: true };
    }
    if (n.left === null || n.right === null) {
      const child = n.left || n.right;
      return { node: recolor(child, 'B'), deficit: false };
    }

    const succ = min(n.right);
    const { node: newRight, deficit } = this._del(n.right, succ.key);
    const merged = node(n.color, n.left, succ.key, succ.value, newRight);
    return deficit ? fixDeficitRight(merged) : { node: merged, deficit: false };
  }

  keys() {
    const out = [];
    (function walk(n) {
      if (n === null) return;
      walk(n.left);
      out.push(n.key);
      walk(n.right);
    })(this.root);
    return out;
  }

  entries() {
    const out = [];
    (function walk(n) {
      if (n === null) return;
      walk(n.left);
      out.push([n.key, n.value]);
      walk(n.right);
    })(this.root);
    return out;
  }

  size() {
    let count = 0;
    (function walk(n) { if (n === null) return; count++; walk(n.left); walk(n.right); })(this.root);
    return count;
  }

  blackHeight() {
    return checkBlackHeight(this.root);
  }
}

function min(n) {
  while (n.left !== null) n = n.left;
  return n;
}

function color(n) {
  return n === null ? 'B' : n.color;
}

function fixDeficitLeft(n) {
  let sib = n.right;

  if (color(sib) === 'R') {
    const newN = node('R', n.left, n.key, n.value, sib.left);
    const { node: fixedN } = fixDeficitLeft(newN);
    return { node: node(n.color, fixedN, sib.key, sib.value, sib.right), deficit: false };
  }

  const sibLeftRed = isRed(sib.left);
  const sibRightRed = isRed(sib.right);

  if (!sibLeftRed && !sibRightRed) {
    const newSib = node('R', sib.left, sib.key, sib.value, sib.right);
    const merged = node(n.color === 'R' ? 'B' : n.color, n.left, n.key, n.value, newSib);
    return { node: merged, deficit: n.color !== 'R' };
  }

  if (!sibRightRed) {
    sib = node('B', sib.left.left, sib.left.key, sib.left.value,
      node('R', sib.left.right, sib.key, sib.value, sib.right));
  }

  const newLeft = node('B', n.left, n.key, n.value, sib.left);
  return { node: node(n.color, newLeft, sib.key, sib.value, recolor(sib.right, 'B')), deficit: false };
}

function fixDeficitRight(n) {
  let sib = n.left;

  if (color(sib) === 'R') {
    const newN = node('R', sib.right, n.key, n.value, n.right);
    const { node: fixedN } = fixDeficitRight(newN);
    return { node: node(n.color, sib.left, sib.key, sib.value, fixedN), deficit: false };
  }

  const sibLeftRed = isRed(sib.left);
  const sibRightRed = isRed(sib.right);

  if (!sibLeftRed && !sibRightRed) {
    const newSib = node('R', sib.left, sib.key, sib.value, sib.right);
    const merged = node(n.color === 'R' ? 'B' : n.color, newSib, n.key, n.value, n.right);
    return { node: merged, deficit: n.color !== 'R' };
  }

  if (!sibLeftRed) {
    sib = node('B', node('R', sib.left, sib.key, sib.value, sib.right.left),
      sib.right.key, sib.right.value, sib.right.right);
  }

  const newRight = node('B', sib.right, n.key, n.value, n.right);
  return { node: node(n.color, recolor(sib.left, 'B'), sib.key, sib.value, newRight), deficit: false };
}

function checkBlackHeight(n) {
  if (n === null) return 1;
  if (n.color === 'R' && (isRed(n.left) || isRed(n.right))) {
    throw new Error('red-red violation at key ' + n.key);
  }
  const lh = checkBlackHeight(n.left);
  const rh = checkBlackHeight(n.right);
  if (lh !== rh) throw new Error('black-height mismatch at key ' + n.key + ` (${lh} vs ${rh})`);
  return lh + (n.color === 'B' ? 1 : 0);
}

module.exports = { PersistentRBTree };
