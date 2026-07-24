const { EphemeralRBTree } = require('./EphemeralRBTree');

function cloneNode(n, parent) {
  if (!n) return null;
  const copy = { key: n.key, value: n.value, color: n.color, parent, left: null, right: null };
  copy.left = cloneNode(n.left, copy);
  copy.right = cloneNode(n.right, copy);
  return copy;
}

class NaiveCopyRBTree {
  constructor(root = null) {
    this.root = root;
  }

  get(key) {
    let n = this.root;
    while (n) {
      if (key < n.key) n = n.left;
      else if (key > n.key) n = n.right;
      else return n.value;
    }
    return undefined;
  }

  insert(key, value) {
    const clone = new EphemeralRBTree();
    clone.root = cloneNode(this.root, null);
    clone.insert(key, value);
    return new NaiveCopyRBTree(clone.root);
  }

  delete(key) {
    const clone = new EphemeralRBTree();
    clone.root = cloneNode(this.root, null);
    clone.delete(key);
    return new NaiveCopyRBTree(clone.root);
  }

  keys() {
    const out = [];
    (function walk(n) { if (!n) return; walk(n.left); out.push(n.key); walk(n.right); })(this.root);
    return out;
  }
}

module.exports = { NaiveCopyRBTree };
