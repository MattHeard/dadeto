import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class FakeStorage {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  bucket(name) {
    return new FakeBucket(this.rootDir, name);
  }
}

class FakeBucket {
  constructor(rootDir, name) {
    this.rootDir = rootDir;
    this.name = name;
    this.bucketDir = path.join(rootDir, name);
  }

  file(filePath) {
    return new FakeFile(this.bucketDir, filePath);
  }
}

class FakeFile {
  constructor(bucketDir, filePath) {
    this.bucketDir = bucketDir;
    this.filePath = normalizeFilePath(filePath);
    this.absolutePath = path.join(bucketDir, this.filePath);
  }

  async save(content) {
    await mkdir(path.dirname(this.absolutePath), { recursive: true });
    await writeFile(this.absolutePath, toBuffer(content));
  }

  async exists() {
    try {
      await stat(this.absolutePath);
      return [true];
    } catch {
      return [false];
    }
  }

  async download() {
    return [await readFile(this.absolutePath)];
  }
}

function normalizeFilePath(filePath) {
  return String(filePath).replace(/^\/+/, '');
}

function toBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (content instanceof Uint8Array) {
    return Buffer.from(content);
  }

  return Buffer.from(String(content));
}

