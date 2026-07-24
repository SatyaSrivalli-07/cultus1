const { PAGE_SIZE } = require('./DiskManager');

class Frame {
  constructor() {
    this.pageId = -1;
    this.pinCount = 0;
    this.isDirty = false;
    this.buffer = Buffer.alloc(PAGE_SIZE);
  }
}

class BufferPoolManager {
  constructor(diskManager, poolSize = 10) {
    this.diskManager = diskManager;
    this.poolSize = poolSize;
    this.frames = Array.from({ length: poolSize }, () => new Frame());
    this.pageTable = new Map();
    this.lruList = [];
  }

  fetchPage(pageId) {
    if (this.pageTable.has(pageId)) {
      const frameIdx = this.pageTable.get(pageId);
      const frame = this.frames[frameIdx];
      frame.pinCount++;
      this._updateLRU(frameIdx);
      return frame;
    }

    const frameIdx = this._getVictimFrame();
    if (frameIdx === -1) {
      throw new Error('All buffer frames are pinned');
    }

    const frame = this.frames[frameIdx];
    if (frame.pageId !== -1) {
      if (frame.isDirty) {
        this.diskManager.writePage(frame.pageId, frame.buffer);
        frame.isDirty = false;
      }
      this.pageTable.delete(frame.pageId);
    }

    frame.pageId = pageId;
    frame.pinCount = 1;
    frame.isDirty = false;
    this.diskManager.readPage(pageId, frame.buffer);
    this.pageTable.set(pageId, frameIdx);
    this._updateLRU(frameIdx);
    return frame;
  }

  newPage() {
    const pageId = this.diskManager.allocatePage();
    return this.fetchPage(pageId);
  }

  unpinPage(pageId, isDirty = false) {
    if (!this.pageTable.has(pageId)) return;
    const frameIdx = this.pageTable.get(pageId);
    const frame = this.frames[frameIdx];
    if (isDirty) frame.isDirty = true;
    if (frame.pinCount > 0) frame.pinCount--;
  }

  flushPage(pageId) {
    if (!this.pageTable.has(pageId)) return;
    const frameIdx = this.pageTable.get(pageId);
    const frame = this.frames[frameIdx];
    if (frame.isDirty) {
      this.diskManager.writePage(frame.pageId, frame.buffer);
      frame.isDirty = false;
    }
  }

  flushAll() {
    for (const frame of this.frames) {
      if (frame.pageId !== -1 && frame.isDirty) {
        this.diskManager.writePage(frame.pageId, frame.buffer);
        frame.isDirty = false;
      }
    }
  }

  _updateLRU(frameIdx) {
    const pos = this.lruList.indexOf(frameIdx);
    if (pos !== -1) {
      this.lruList.splice(pos, 1);
    }
    this.lruList.push(frameIdx);
  }

  _getVictimFrame() {
    for (let i = 0; i < this.frames.length; i++) {
      if (this.frames[i].pageId === -1) return i;
    }
    for (let i = 0; i < this.lruList.length; i++) {
      const idx = this.lruList[i];
      if (this.frames[idx].pinCount === 0) {
        return idx;
      }
    }
    return -1;
  }
}

module.exports = { BufferPoolManager };
