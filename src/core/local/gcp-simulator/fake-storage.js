import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class FakeStorage {
  /**
   * @param {{ rootDir: string }} options Storage root options.
   */
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  /**
   * @param {string} name Bucket name.
   * @returns {FakeBucket} Bucket handle.
   */
  bucket(name) {
    return new FakeBucket(this.rootDir, name);
  }
}

class FakeBucket {
  /**
   * @param {string} rootDir Storage root directory.
   * @param {string} name Bucket name.
   */
  constructor(rootDir, name) {
    this.rootDir = rootDir;
    this.name = name;
    this.bucketDir = path.join(rootDir, name);
  }

  /**
   * @param {string} filePath File path within the bucket.
   * @returns {FakeFile} File handle.
   */
  file(filePath) {
    return new FakeFile(this.bucketDir, filePath);
  }
}

class FakeFile {
  /**
   * @param {string} bucketDir Bucket directory.
   * @param {string} filePath File path within the bucket.
   */
  constructor(bucketDir, filePath) {
    this.bucketDir = bucketDir;
    this.filePath = normalizeFilePath(filePath);
    this.absolutePath = path.join(bucketDir, this.filePath);
  }

  /**
   * @param {string | Buffer | Uint8Array} content File contents.
   */
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

/**
 * Normalize a bucket-relative file path.
 * @param {string} filePath File path.
 * @returns {string} Normalized file path.
 */
function normalizeFilePath(filePath) {
  return String(filePath).replace(/^\/+/, '');
}

/**
 * Convert supported content values to a Buffer.
 * @param {string | Buffer | Uint8Array} content Content value.
 * @returns {Buffer} Buffer payload.
 */
function toBuffer(content) {
  if (Buffer.isBuffer(content)) {
    return content;
  }

  if (content instanceof Uint8Array) {
    return Buffer.from(content);
  }

  return Buffer.from(String(content));
}
