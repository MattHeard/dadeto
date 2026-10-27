import ts from 'typescript';
import path from 'node:path';

test('the lineage boundary requires a string-returning hash dependency', () => {
  const filename = path.resolve('test/lineage-hash-contract-fixture.ts');
  const parserPath = path.resolve(
    'src/core/build/function-endpoint-lineage.js'
  );
  const source = `import { parseFunctionEndpointLineage } from ${JSON.stringify(parserPath)};
parseFunctionEndpointLineage('{}', {}, () => 'digest');
parseFunctionEndpointLineage('{}', {});
parseFunctionEndpointLineage('{}', {}, () => 42);
`;
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
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter(diagnostic => diagnostic.file?.fileName === filename);
  expect(
    diagnostics.map(diagnostic => ({
      code: diagnostic.code,
      line:
        diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line +
        1,
    }))
  ).toEqual([
    { code: 2554, line: 3 },
    { code: 2322, line: 4 },
  ]);
});
