import { describe, expect, test, jest } from '@jest/globals';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { createCloneScanHandle } from '../../src/core/scripts/clone-scanner.js';

const require = createRequire(import.meta.url);
const core = require('@jscpd/core');
const tokenizer = require('@jscpd/tokenizer');
const SOURCE =
  'function duplicate() {\n  const value = {\n    left: 1,\n    right: 2,\n  };\n  return value;\n}\n';

/**
 * Build in-memory filesystem adapters around the pinned production detector.
 * @returns {Record<string, any>} Scanner fixture.
 */
function fixture() {
  const files = new Map([
    [
      '.jscpd.json',
      JSON.stringify({
        path: ['fixture'],
        mode: 'strict',
        minTokens: 14,
        reporters: ['html', 'json'],
        output: 'report',
      }),
    ],
    ['fixture/a.js', SOURCE],
    ['fixture/b.js', SOURCE],
    ['fixture/short.js', 'one line'],
    ['fixture/long.js', '\n'.repeat(20)],
  ]);
  const writes = new Map();
  const deps = {
    readFile: jest.fn(target => files.get(target)),
    readDirectory: jest.fn(() =>
      [
        'directory',
        'unknown',
        'large.js',
        'short.js',
        'long.js',
        'a.js',
        'b.js',
      ].map(name => ({
        parentPath: 'fixture',
        name,
        isFile: () => name !== 'directory',
        isSymbolicLink: () => false,
      }))
    ),
    fileSize: target => (target.endsWith('large.js') ? 200000 : 100),
    joinPath: (...parts) => parts.join('/'),
    parseSize: () => 102400,
    getDefaultOptions: () => ({ ...core.getDefaultOptions(), maxLines: 10 }),
    resolveMode: core.getModeHandler,
    formatFor: tokenizer.getFormatByFile,
    createStatistics: () => new core.Statistic(),
    createDetector: options =>
      new core.Detector(new tokenizer.Tokenizer(), new core.MemoryStore(), [], {
        ...options,
        hashFunction: value => createHash('md5').update(value).digest('hex'),
      }),
    makeDirectory: jest.fn(),
    writeFile: (target, content) => writes.set(target, content),
  };
  return {
    files,
    writes,
    deps,
    run: () => createCloneScanHandle(deps, '.jscpd.json')(),
  };
}

describe('original clone engine with safe enumeration', () => {
  test('detects strict clones with exact legacy locations and filters before reading', async () => {
    const { deps, writes, run } = fixture();
    const report = await run();
    expect(report.duplicates).toHaveLength(1);
    expect(report.statistics.total.clones).toBe(1);
    expect(report.duplicates[0]).toMatchObject({
      format: 'javascript',
      tokens: 0,
      firstFile: { name: 'fixture/a.js' },
      secondFile: { name: 'fixture/b.js' },
    });
    expect(report.duplicates[0].fragment).toContain('function duplicate()');
    expect(deps.readFile).not.toHaveBeenCalledWith('fixture/unknown');
    expect(deps.readFile).not.toHaveBeenCalledWith('fixture/large.js');
    expect(deps.readFile).not.toHaveBeenCalledWith('fixture/directory');
    expect(deps.makeDirectory).toHaveBeenCalledWith('report/html');
    expect(JSON.parse(writes.get('report/jscpd-report.json'))).toEqual(report);
    expect(writes.get('report/html/jscpd-report.json')).toBe(
      writes.get('report/jscpd-report.json')
    );
    expect(writes.get('report/html/index.html')).toContain('1 clones');
  });

  test('writes a zero-clone report when no source is eligible', async () => {
    const { deps, run } = fixture();
    deps.readDirectory.mockReturnValue([]);
    const report = await run();
    expect(report.duplicates).toEqual([]);
    expect(report.statistics.total.sources).toBe(0);
  });

  test('escapes code and filenames in the HTML report while leaving JSON untouched', async () => {
    const { deps, files, writes, run } = fixture();
    deps.readDirectory.mockReturnValue([
      {
        parentPath: 'fixture',
        name: '<a>.js',
        isFile: () => true,
        isSymbolicLink: () => false,
      },
    ]);
    files.set(
      'fixture/<a>.js',
      SOURCE.replace('duplicate()', 'duplicate() /* <script> */')
    );
    deps.createDetector = () => ({
      on: jest.fn(),
      detect: async () => [
        {
          format: 'javascript',
          duplicationA: {
            sourceId: 'fixture/<a>.js',
            start: { line: 1 },
            end: { line: 6 },
            range: [0, 100],
          },
          duplicationB: {
            sourceId: 'fixture/<a>.js',
            start: { line: 1 },
            end: { line: 6 },
          },
        },
      ],
    });
    const report = await run();
    expect(report.duplicates[0].firstFile.name).toBe('fixture/<a>.js');
    expect(writes.get('report/html/index.html')).toContain(
      'fixture/&lt;a&gt;.js'
    );
    expect(writes.get('report/html/index.html')).toContain('&lt;script&gt;');
    expect(writes.get('report/html/index.html')).not.toContain(
      'fixture/<a>.js'
    );
  });

  test('rejects suppression options and malformed configuration without publishing', async () => {
    const { files, writes, run } = fixture();
    files.set('.jscpd.json', '{');
    await expect(run()).rejects.toThrow();
    files.set('.jscpd.json', JSON.stringify({ ignore: ['**/*'] }));
    await expect(run()).rejects.toThrow(
      'Unsupported clone scanner options: ignore'
    );
    expect(writes.size).toBe(0);
  });

  test('fails rather than silently ignoring linked source directories', async () => {
    const { deps, writes, run } = fixture();
    deps.readDirectory.mockReturnValue([
      { name: 'linked', isSymbolicLink: () => true },
    ]);
    await expect(run()).rejects.toThrow(
      'Linked scan entry requires explicit enumeration: linked'
    );
    expect(writes.size).toBe(0);
  });

  test('propagates engine failure without publishing a stale success report', async () => {
    const { deps, writes, run } = fixture();
    deps.createDetector = () => ({
      on: jest.fn(),
      detect: async () => {
        throw new Error('engine failed');
      },
    });
    await expect(run()).rejects.toThrow('engine failed');
    expect(writes.size).toBe(0);
  });
});
