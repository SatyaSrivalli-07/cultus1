class Node {
  constructor(key, value, color) {
    this.key = key;
    this.value = value;
    this.color = color;
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

class EphemeralRBTree {
  constructor() {
    this.root = null;
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

  has(key) {
    return this.get(key) !== undefined;
  }

  insert(key, value) {
    let parent = null, n = this.root;
    while (n) {
      parent = n;
      if (key < n.key) n = n.left;
      else if (key > n.key) n = n.right;
      else { n.value = value; return; }
    }
    const fresh = new Node(key, value, 'R');
    fresh.parent = parent;
    if (!parent) this.root = fresh;
    else if (key < parent.key) parent.left = fresh;
    else parent.right = fresh;
    this._fixInsert(fresh);
  }

  _fixInsert(n) {
    while (n.parent && n.parent.color === 'R') {
      const parent = n.parent, grand = parent.parent;
      if (!grand) break;
      if (parent === grand.left) {
        const uncle = grand.right;
        if (uncle && uncle.color === 'R') {
          parent.color = 'B'; uncle.color = 'B'; grand.color = 'R';
          n = grand;
        } else {
          if (n === parent.right) { n = parent; this._rotateLeft(n); }
          n.parent.color = 'B'; n.parent.parent.color = 'R';
          this._rotateRight(n.parent.parent);
        }
      } else {
        const uncle = grand.left;
        if (uncle && uncle.color === 'R') {
          parent.color = 'B'; uncle.color = 'B'; grand.color = 'R';
          n = grand;
        } else {
          if (n === parent.left) { n = parent; this._rotateRight(n); }
          n.parent.color = 'B'; n.parent.parent.color = 'R';
          this._rotateLeft(n.parent.parent);
        }
      }
    }
    this.root.color = 'B';
  }

  _rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  _rotateRight(x) {
    const y = x.left;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  delete(key) {
    let z = this.root;
    while (z && z.key !== key) z = key < z.key ? z.left : z.right;
    if (!z) return false;

    let y = z, yOriginalColor = y.color, x, xParent;

    if (!z.left) {
      x = z.right; xParent = z.parent;
      this._transplant(z, z.right);
    } else if (!z.right) {
      x = z.left; xParent = z.parent;
      this._transplant(z, z.left);
    } else {
      y = this._min(z.right);
      yOriginalColor = y.color;
      x = y.right; xParent = y;
      if (y.parent === z) {
        if (x) x.parent = y;
      } else {
        this._transplant(y, y.right);
        y.right = z.right;
        y.right.parent = y;
        xParent = y.parent;
      }
      this._transplant(z, y);
      y.left = z.left;
      y.left.parent = y;
      y.color = z.color;
    }

    if (yOriginalColor === 'B') this._fixDelete(x, xParent);
    return true;
  }

  _min(n) { while (n.left) n = n.left; return n; }

  _transplant(u, v) {
    if (!u.parent) this.root = v;
    else if (u === u.parent.left) u.parent.left = v;
    else u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _fixDelete(x, parent) {
    while (x !== this.root && (!x || x.color === 'B')) {
      if (x === parent.left) {
        let w = parent.right;
        if (w.color === 'R') {
          w.color = 'B'; parent.color = 'R';
          this._rotateLeft(parent);
          w = parent.right;
        }
        if ((!w.left || w.left.color === 'B') && (!w.right || w.right.color === 'B')) {
          w.color = 'R'; x = parent; parent = x.parent;
        } else {
          if (!w.right || w.right.color === 'B') {
            if (w.left) w.left.color = 'B';
            w.color = 'R';
            this._rotateRight(w);
            w = parent.right;
          }
          w.color = parent.color; parent.color = 'B';
          if (w.right) w.right.color = 'B';
          this._rotateLeft(parent);
          x = this.root; parent = null;
        }
      } else {
        let w = parent.left;
        if (w.color === 'R') {
          w.color = 'B'; parent.color = 'R';
          this._rotateRight(parent);
          w = parent.left;
        }
        if ((!w.right || w.right.color === 'B') && (!w.left || w.left.color === 'B')) {
          w.color = 'R'; x = parent; parent = x.parent;
        } else {
          if (!w.left || w.left.color === 'B') {
            if (w.right) w.right.color = 'B';
            w.color = 'R';
            this._rotateLeft(w);
            w = parent.left;
          }
          w.color = parent.color; parent.color = 'B';
          if (w.left) w.left.color = 'B';
          this._rotateRight(parent);
          x = this.root; parent = null;
        }
      }
    }
    if (x) x.color = 'B';
  }

  keys() {
    const out = [];
    (function walk(n) { if (!n) return; walk(n.left); out.push(n.key); walk(n.right); })(this.root);
    return out;
  }

  size() {
    let count = 0;
    (function walk(n) { if (!n) return; count++; walk(n.left); walk(n.right); })(this.root);
    return count;
  }
}

module.exports = { EphemeralRBTree };
