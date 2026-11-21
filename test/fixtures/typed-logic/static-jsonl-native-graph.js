import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

export const staticJsonlOriginal = JSON.parse(
  readFileSync(
    new URL('./static-jsonl-legacy-source.json', import.meta.url),
    'utf8'
  )
);

/**
 * Load a frozen actual module graph while retaining native export implementations.
 * @param {string} entry Repository-relative original entry path.
 * @returns {Promise<object>} Native module namespace.
 */
export async function loadStaticJsonlOriginal(entry) {
  const urls = new Map();
  const urlFor = async file => {
    if (!urls.has(file))
      urls.set(
        file,
        (async () => {
          const frozen = staticJsonlOriginal.modules[file];
          assert.ok(frozen, `Unfrozen original dependency: ${file}`);
          let source = frozen.source;
          assert.equal(
            createHash('sha256').update(source).digest('hex'),
            frozen.sha256
          );
          const imports = parse(source, { sourceType: 'module' })
            .program.body.filter(node => node.source)
            .map(node => node.source)
            .toSorted((left, right) => right.start - left.start);
          for (const specifier of imports) {
            assert.ok(specifier.value.startsWith('.'));
            const target = path.posix.normalize(
              path.posix.join(path.posix.dirname(file), specifier.value)
            );
            source =
              source.slice(0, specifier.start) +
              JSON.stringify(await urlFor(target)) +
              source.slice(specifier.end);
          }
          return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
        })()
      );
    return urls.get(file);
  };
  return import(await urlFor(entry));
}
