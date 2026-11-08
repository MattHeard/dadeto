/**
 * Generate legacy formatting inputs independently of the policy implementation.
 * @returns {{wrappers: string[], entrypoints: string[]}} Compatibility corpus.
 */
export function createLegacyPolicyCases() {
  const spacing = ['', ' ', '  ', '\t', '\n', '\r\n', '\u2028'];
  const wrappers = [];
  const entrypoints = [];
  const base =
    "#!/usr/bin/env node\nimport { env } from './environment.js';\nimport { createCopyCore } from '../core/copy.js';\ncreateCopyCore(environmentDependencies).runCopyWorkflow();\n";
  for (const first of spacing) {
    for (const second of spacing) {
      for (const third of spacing) {
        wrappers.push(
          `const${first}handle${second}=${third}maker${first}();handle${second}();`,
          `const${first}{${second}handle${third}}${second}=${third}maker${first}();export${first}{handle};`,
          `export${first}const${second}handle${third}=maker();`,
          `export${first}{ item }${second}from${third}'../core/item.js'${first};`,
          `// header\n${first}// indented comment\nexport * from '../../core/item.js';${second}export { helper } from '../commonCore.js'${third};`,
          `handle${first}();${second}const handle=maker();`,
          `const handle=maker();${first}await${second}handle${third}();`
        );
        entrypoints.push(
          `${base}function${first}named${second}()${third}{}`,
          `${base}const make = () => {${first}function${second}nested${third}() {} };`
        );
      }
    }
  }
  wrappers.push(
    '',
    ' \n\t ',
    "export * from '../core/item.js'; // inline comment",
    "export * from '../core/item.js';\nconst extra = 1;"
  );
  return { wrappers, entrypoints };
}
