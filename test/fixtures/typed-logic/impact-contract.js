import path from 'node:path';

/**
 * Explicit inputs avoid changed Git discovery grammar and pin existing CLI behavior.
 * @returns {Array<{name: string, mode: string, argv: string[], scenario: string}>} Cases.
 */
export function impactContractCases() {
  const cases = [];
  const inputs = [
    ['--files', 'test/core/a.test.js'],
    [
      '--files',
      './test/core/a.test.js',
      'test/core/a.test.js',
      'test/core/b.test.js',
    ],
    ['--files', 'src/core/a.js'],
    ['--files', 'src/logic/core/a.js', 'src/logic/boundary/b.js'],
    ['--files', 'src/local/adapter.js', 'test/core/direct.test.js'],
    ['--files', "src/core/it's a file.js"],
    ['--files', 'src/core/../unsafe.js'],
    ['--files', '/absolute.js'],
    ['--files', 'src/core/new\nline.js'],
    ['--files', 'test/e2e/example.test.js'],
    ['--files', 'README.md'],
    ['--files'],
    ['--base'],
    ['--base', '--invalid'],
    ['--invalid'],
    ['--files', 'src/core/a.js', '--base', 'main'],
  ];
  const scenarios = [
    'pass',
    'selector-fail',
    'selector-error',
    'no-related',
    'tests-fail',
    'tests-error',
    'fallback-list-fail',
    'no-fallback-tests',
    'coverage-missing',
    'coverage-uncovered',
    'static-fail',
    'shards',
  ];
  for (const mode of ['plan', 'tests', 'scoped']) {
    for (const [index, argv] of inputs.entries()) {
      for (const scenario of scenarios)
        cases.push({
          name: `${mode}-${index}-${scenario}`,
          mode,
          argv,
          scenario,
        });
    }
  }
  return cases;
}

/**
 * Observe public results, complete output and injected operation contracts.
 * @param {Record<string, Function>} implementation Original or current factories.
 * @param {{mode: string, argv: string[], scenario: string}} input Invocation case.
 * @returns {object} CLI outcome with deterministic platform adapters.
 */
export function observeImpactContract(implementation, input) {
  const calls = [];
  const output = [];
  const permission = {};
  const { scenario } = input;
  const failure = { status: 1, stdout: '', stderr: 'fixture failure' };
  const error = { status: null, error: new Error('fixture exception') };
  const operationResult = () =>
    scenario === 'tests-error'
      ? error
      : scenario === 'tests-fail'
        ? failure
        : {
            status: 0,
            stdout: 'fixture passed\n',
            stderr: 'fixture warning\n',
          };
  const factories = {
    plan: 'createPlanCheckImpactHandle',
    tests: 'createRunCheckImpactHandle',
    scoped: 'createRunScopedCheckImpactHandle',
  };
  const handle = implementation[factories[input.mode]]({
    argv: input.argv,
    rootDir: '/fixture',
    processExecPath: '/node',
    impactShardSize: scenario === 'shards' ? 1 : 40,
    pathModule: path,
    fileExists: () => true,
    bindStartupEffectBoundary: callback => callback(permission),
    writeOutput: (token, value) => {
      output.push(value);
      calls.push({ operation: 'write', authorized: token === permission });
    },
    runCommand: (token, command, args, options) => {
      calls.push({
        operation: 'command',
        authorized: token === permission,
        command,
        args,
        options,
      });
      if (args.includes('--findRelatedTests')) {
        if (scenario === 'selector-fail') return failure;
        if (scenario === 'selector-error') return error;
        return {
          status: 0,
          stdout:
            scenario === 'no-related'
              ? ''
              : '/fixture/test/core/related.test.js\ntest/core/second.test.js\n',
        };
      }
      if (command === 'git') {
        if (scenario === 'fallback-list-fail') return failure;
        return {
          status: 0,
          stdout:
            scenario === 'no-fallback-tests'
              ? ''
              : 'test/core/a.test.js\0test/core/b.test.js\0test/e2e/excluded.test.js\0README.md\0',
        };
      }
      if (command === 'npm')
        return scenario === 'static-fail'
          ? failure
          : { status: 0, stdout: 'static passed\n' };
      return operationResult();
    },
    runCoverage: (token, tests, sourceFiles) => {
      calls.push({
        operation: 'coverage',
        authorized: token === permission,
        tests,
        sourceFiles,
      });
      const record =
        scenario === 'coverage-uncovered'
          ? {
              statementMap: { 0: { start: { line: 7 } } },
              s: { 0: 0 },
              branchMap: { 0: { line: 9, locations: [{}, {}] } },
              b: { 0: [1, 0] },
            }
          : { statementMap: {}, s: {}, branchMap: {}, b: {} };
      return {
        ...operationResult(),
        command: 'fixture coverage',
        coverage:
          scenario === 'coverage-missing'
            ? {}
            : Object.fromEntries(
                sourceFiles.map(file => [
                  path.resolve('/fixture', file),
                  record,
                ])
              ),
      };
    },
  });
  return { result: handle(), output, calls };
}
