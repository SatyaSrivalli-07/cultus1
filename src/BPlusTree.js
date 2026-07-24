const { PAGE_SIZE } = require('./DiskManager');

class NodeSerializer {
  static serialize(frame, node) {
    const buf = frame.buffer;
    buf.fill(0);
    buf.writeUInt32BE(node.pageId, 0);
    buf.writeUInt8(node.isLeaf ? 1 : 0, 4);
    buf.writeUInt16BE(node.keys.length, 5);
    buf.writeInt32BE(node.nextPageId, 7);
    buf.writeInt32BE(node.parentPageId, 11);

    let offset = 15;
    if (node.isLeaf) {
      for (let i = 0; i < node.keys.length; i++) {
        buf.writeInt32BE(node.keys[i], offset);
        offset += 4;
        const valBuf = Buffer.from(String(node.values[i]), 'utf8');
        buf.writeUInt16BE(valBuf.length, offset);
        offset += 2;
        valBuf.copy(buf, offset);
        offset += valBuf.length;
      }
    } else {
      for (let i = 0; i < node.children.length; i++) {
        buf.writeInt32BE(node.children[i], offset);
        offset += 4;
      }
      for (let i = 0; i < node.keys.length; i++) {
        buf.writeInt32BE(node.keys[i], offset);
        offset += 4;
      }
    }
  }

  static deserialize(frame) {
    const buf = frame.buffer;
    const pageId = buf.readUInt32BE(0);
    const isLeaf = buf.readUInt8(4) === 1;
    const numKeys = buf.readUInt16BE(5);
    const nextPageId = buf.readInt32BE(7);
    const parentPageId = buf.readInt32BE(11);

    const node = {
      pageId,
      isLeaf,
      nextPageId,
      parentPageId,
      keys: [],
      values: [],
      children: []
    };

    let offset = 15;
    if (isLeaf) {
      for (let i = 0; i < numKeys; i++) {
        const key = buf.readInt32BE(offset);
        offset += 4;
        const valLen = buf.readUInt16BE(offset);
        offset += 2;
        const valStr = buf.toString('utf8', offset, offset + valLen);
        offset += valLen;
        node.keys.push(key);
        node.values.push(valStr);
      }
    } else {
      for (let i = 0; i < numKeys + 1; i++) {
        node.children.push(buf.readInt32BE(offset));
        offset += 4;
      }
      for (let i = 0; i < numKeys; i++) {
        node.keys.push(buf.readInt32BE(offset));
        offset += 4;
      }
    }
    return node;
  }
}

class BPlusTree {
  constructor(bpm, maxKeys = 4) {
    this.bpm = bpm;
    this.maxKeys = maxKeys;
    this.rootPageId = -1;
    this._initTree();
  }

  _initTree() {
    const rootFrame = this.bpm.newPage();
    this.rootPageId = rootFrame.pageId;
    const rootNode = {
      pageId: this.rootPageId,
      isLeaf: true,
      nextPageId: -1,
      parentPageId: -1,
      keys: [],
      values: [],
      children: []
    };
    NodeSerializer.serialize(rootFrame, rootNode);
    this.bpm.unpinPage(this.rootPageId, true);
  }

  search(key) {
    const leaf = this._findLeaf(key);
    const idx = leaf.keys.indexOf(key);
    const val = idx !== -1 ? leaf.values[idx] : undefined;
    return val;
  }

  rangeSearch(startKey, endKey) {
    const results = [];
    let leaf = this._findLeaf(startKey);
    while (leaf) {
      for (let i = 0; i < leaf.keys.length; i++) {
        if (leaf.keys[i] >= startKey && leaf.keys[i] <= endKey) {
          results.push({ key: leaf.keys[i], value: leaf.values[i] });
        }
      }
      const nextId = leaf.nextPageId;
      if (nextId === -1) break;
      if (leaf.keys.length > 0 && leaf.keys[leaf.keys.length - 1] > endKey) {
        break;
      }
      leaf = this._loadNode(nextId);
    }
    return results;
  }

  insert(key, value) {
    const leaf = this._findLeaf(key);
    let idx = 0;
    while (idx < leaf.keys.length && leaf.keys[idx] < key) idx++;
    if (idx < leaf.keys.length && leaf.keys[idx] === key) {
      leaf.values[idx] = value;
      this._saveNode(leaf);
      return;
    }

    leaf.keys.splice(idx, 0, key);
    leaf.values.splice(idx, 0, value);

    if (leaf.keys.length > this.maxKeys) {
      this._splitLeaf(leaf);
    } else {
      this._saveNode(leaf);
    }
  }

  delete(key) {
    const leaf = this._findLeaf(key);
    const idx = leaf.keys.indexOf(key);
    if (idx === -1) {
      return false;
    }

    leaf.keys.splice(idx, 1);
    leaf.values.splice(idx, 1);
    this._saveNode(leaf);
    return true;
  }

  _loadNode(pageId) {
    const frame = this.bpm.fetchPage(pageId);
    const node = NodeSerializer.deserialize(frame);
    this.bpm.unpinPage(pageId, false);
    return node;
  }

  _saveNode(node) {
    const frame = this.bpm.fetchPage(node.pageId);
    NodeSerializer.serialize(frame, node);
    this.bpm.unpinPage(node.pageId, true);
  }

  _findLeaf(key) {
    let currNode = this._loadNode(this.rootPageId);
    while (!currNode.isLeaf) {
      let idx = 0;
      while (idx < currNode.keys.length && key >= currNode.keys[idx]) idx++;
      const childId = currNode.children[idx];
      currNode = this._loadNode(childId);
    }
    return currNode;
  }

  _splitLeaf(leaf) {
    const mid = Math.floor(leaf.keys.length / 2);
    const rightFrame = this.bpm.newPage();
    const rightPageId = rightFrame.pageId;

    const rightNode = {
      pageId: rightPageId,
      isLeaf: true,
      nextPageId: leaf.nextPageId,
      parentPageId: leaf.parentPageId,
      keys: leaf.keys.slice(mid),
      values: leaf.values.slice(mid),
      children: []
    };

    leaf.keys = leaf.keys.slice(0, mid);
    leaf.values = leaf.values.slice(0, mid);
    leaf.nextPageId = rightPageId;

    const pushKey = rightNode.keys[0];
    this.bpm.unpinPage(rightPageId, false);

    this._saveNode(leaf);
    this._saveNode(rightNode);

    this._insertIntoParent(leaf.pageId, pushKey, rightNode.pageId, leaf.parentPageId);
  }

  _insertIntoParent(leftId, key, rightId, parentId) {
    if (parentId === -1) {
      const newRootFrame = this.bpm.newPage();
      this.rootPageId = newRootFrame.pageId;
      const newRoot = {
        pageId: this.rootPageId,
        isLeaf: false,
        nextPageId: -1,
        parentPageId: -1,
        keys: [key],
        values: [],
        children: [leftId, rightId]
      };
      this.bpm.unpinPage(this.rootPageId, false);
      this._saveNode(newRoot);

      this._updateParentPointer(leftId, this.rootPageId);
      this._updateParentPointer(rightId, this.rootPageId);
      return;
    }

    const parent = this._loadNode(parentId);

    let idx = 0;
    while (idx < parent.keys.length && parent.keys[idx] < key) idx++;
    parent.keys.splice(idx, 0, key);
    parent.children.splice(idx + 1, 0, rightId);

    this._updateParentPointer(rightId, parentId);

    if (parent.keys.length > this.maxKeys) {
      this._splitInternal(parent);
    } else {
      this._saveNode(parent);
    }
  }

  _splitInternal(node) {
    const mid = Math.floor(node.keys.length / 2);
    const pushKey = node.keys[mid];

    const rightFrame = this.bpm.newPage();
    const rightPageId = rightFrame.pageId;

    const rightNode = {
      pageId: rightPageId,
      isLeaf: false,
      nextPageId: -1,
      parentPageId: node.parentPageId,
      keys: node.keys.slice(mid + 1),
      values: [],
      children: node.children.slice(mid + 1)
    };

    node.keys = node.keys.slice(0, mid);
    node.children = node.children.slice(0, mid + 1);

    this.bpm.unpinPage(rightPageId, false);

    for (const childId of rightNode.children) {
      this._updateParentPointer(childId, rightPageId);
    }

    this._saveNode(node);
    this._saveNode(rightNode);

    this._insertIntoParent(node.pageId, pushKey, rightNode.pageId, node.parentPageId);
  }

  _updateParentPointer(childId, newParentId) {
    const childNode = this._loadNode(childId);
    childNode.parentPageId = newParentId;
    this._saveNode(childNode);
  }
}

module.exports = { BPlusTree };
