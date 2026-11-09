/**
 * Project explicit relative module pairs through the injected path operation.
 * @param {Array<[string, string]>} entries Source/target pairs.
 * @param {string} srcDir Source root.
 * @param {string} outputDir Artifact root.
 * @param {(first: string, ...rest: string[]) => string} join Injected path join.
 * @returns {Array<{source: string, target: string}>} Exact module copies.
 */
export function createAssetCopies(entries, srcDir, outputDir, join) {
  return entries.map(([source, target]) => ({
    source: join(srcDir, source),
    target: join(outputDir, target),
  }));
}
