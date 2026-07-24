const fs = require('fs');

const PAGE_SIZE = 4096;

class DiskManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.numPages = 0;
    this.diskReads = 0;
    this.diskWrites = 0;
    this.fd = fs.openSync(filePath, 'w+');
  }

  allocatePage() {
    const pageId = this.numPages++;
    const emptyBuffer = Buffer.alloc(PAGE_SIZE);
    this.writePage(pageId, emptyBuffer);
    return pageId;
  }

  readPage(pageId, buffer) {
    const offset = pageId * PAGE_SIZE;
    const bytesRead = fs.readSync(this.fd, buffer, 0, PAGE_SIZE, offset);
    if (bytesRead < PAGE_SIZE) {
      buffer.fill(0, bytesRead);
    }
    this.diskReads++;
  }

  writePage(pageId, buffer) {
    const offset = pageId * PAGE_SIZE;
    fs.writeSync(this.fd, buffer, 0, PAGE_SIZE, offset);
    this.diskWrites++;
  }

  close() {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
    if (fs.existsSync(this.filePath)) {
      try {
        fs.unlinkSync(this.filePath);
      } catch (e) {}
    }
  }
}

module.exports = { DiskManager, PAGE_SIZE };
