import ts from 'typescript';
import path from 'node:path';
import fs from 'node:fs';

test('generator and its presentation helpers stay in checkJs discovery', () => {
  const configFile = ts.readConfigFile('tsconfig.jsdoc.json', ts.sys.readFile);
  expect(configFile.error).toBeUndefined();
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, '.');
  const discovered = new Set(config.fileNames.map(file => path.resolve(file)));
  for (const name of [
    'generator',
    'full-width',
    'head',
    'navbar',
    'styles',
    'title',
  ]) {
    expect(discovered.has(path.resolve(`src/core/build/${name}.js`))).toBe(
      true
    );
  }
});

test('generator contracts preserve payload types and reject malformed callers', () => {
  const filename = path.resolve('test/generator-contract-fixture.ts');
  const generatorPath = path.resolve('src/core/build/generator.js');
  const cases = [
    [
      `import { createGeneratorHandle, generateBlogOuter, getDefaultInputMethod, createIdAttributeIfNeeded } from ${JSON.stringify(generatorPath)};`,
      false,
    ],
    [
      `import type { Blog, BodyEntry } from ${JSON.stringify(generatorPath)};`,
      false,
    ],
    [
      'const generator = createGeneratorHandle({renderStaticJsonlTable: entry => entry.source});',
      false,
    ],
    [
      "const blog: Blog = {posts: [{key: 'K', title: 'Title', publicationDate: '2026-01-01', content: ['text', 0, false, null, {type: 'quote', content: ['one', 'two']}, {type: 'manual', markdown: '# Guide'}, {type: 'table', source: 'rows.jsonl', columns: ['value']}, {type: 'illustration', content: {fileType: 'png', altText: 'Picture'}}, {type: 'audio', content: {fileType: 'mp3'}}, {type: 'video', content: {id: 'video'}}, {type: 'links', content: [{url: '/path', title: 'Link'}]}, {type: 'toy'}], toy: {modulePath: '/toy.js', functionName: 'toy'}}]};",
      false,
    ],
    ['const html: string = generator.generateBlogOuter(blog);', false],
    [
      'const selected: string | undefined = getDefaultInputMethod({toy: {}});',
      false,
    ],
    ["const id: string = createIdAttributeIfNeeded({key: 'K'});", false],
    [
      "const missingSource: BodyEntry = {type: 'table', columns: ['value']};",
      true,
    ],
    [
      "const wrongColumns: BodyEntry = {type: 'table', source: 'rows.jsonl', columns: [1]};",
      true,
    ],
    [
      "const wrongMedia: BodyEntry = {type: 'audio', content: {id: 'video'}};",
      true,
    ],
    [
      "const wrongQuote: BodyEntry = {type: 'quote', content: {text: 'quote'}};",
      true,
    ],
    [
      "const unknownType: BodyEntry = {type: 'mystery', content: 'text'};",
      true,
    ],
    ['createGeneratorHandle({renderStaticJsonlTable: () => 42});', true],
    ['generateBlogOuter(blog);', true],
    ["generator.generateBlogOuter({posts: [{key: 'K'}]});", true],
    ['const requiredInput: string = getDefaultInputMethod({toy: {}});', true],
  ];
  const source = cases.map(([line]) => line).join('\n');
  const options = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const originalReader = host.readFile.bind(host);
  host.readFile = file => (file === filename ? source : originalReader(file));
  const program = ts.createProgram([filename], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  expect(
    diagnostics.every(diagnostic => diagnostic.file?.fileName === filename)
  ).toBe(true);
  const rejectedLines = diagnostics.map(
    diagnostic =>
      diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line
  );
  expect([...new Set(rejectedLines)]).toEqual(
    cases.flatMap(([, invalid], index) => (invalid ? [index] : []))
  );
  // The fixture is virtual; keep compiler checks independent of generated files.
  expect(fs.existsSync(filename)).toBe(false);
});
