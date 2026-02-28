import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_DOCUMENT_PATH = path.resolve(
  process.cwd(),
  'local-data',
  'writer.md'
);

/**
 * @param {{ documentPath?: string }} [options]
 */
export function createDocumentStore(options = {}) {
  const documentPath = options.documentPath ?? DEFAULT_DOCUMENT_PATH;

  return {
    documentPath,
    async load() {
      try {
        return await readFile(documentPath, 'utf8');
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          return '';
        }
        throw error;
      }
    },
    async save(content) {
      await mkdir(path.dirname(documentPath), { recursive: true });
      await writeFile(documentPath, content, 'utf8');
      return {
        bytes: Buffer.byteLength(content, 'utf8'),
        savedAt: new Date().toISOString(),
      };
    },
  };
}
