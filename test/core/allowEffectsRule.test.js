import { Linter, ESLint } from 'eslint';
import ts from 'typescript';
import { resolve } from 'node:path';
import { capabilityProgramFor } from '../../eslint.config.js';
import { createAllowEffectsRule } from '../../src/core/scripts/allow-effects.js';

const filename = resolve(
  'src/core/cloud/submit-new-story/capability-fixture.js'
);
const submitPageFilename = resolve(
  'src/core/cloud/submit-new-page/capability-fixture.js'
);
const prefix = `
/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @param {AllowEffects} permission @param {string} text */
function send(permission, text) {}
`;

/**
 * Inspect a source fixture with the real compiler-backed ownership rule.
 * @param {string} source JavaScript fixture body.
 * @param {Function} programFor Compiler provider under test.
 * @returns {string[]} Reported capability invariant failures.
 */
function findings(source, programFor = capabilityProgramFor) {
  const lint = new Linter();
  return lint
    .verify(
      prefix + source,
      [
        {
          plugins: {
            capability: {
              rules: {
                frames: createAllowEffectsRule(ts, programFor),
              },
            },
          },
          rules: { 'capability/frames': 'error' },
        },
      ],
      { filename }
    )
    .map(message => message.messageId);
}

test.each([
  '/** @param {AllowEffects} permission */ function work(permission) { send(permission, "ok"); }',
  'function factory() { return (/** @type {AllowEffects} */ renamed) => send(renamed, "ok"); }',
  '/** @param {AllowEffects} permit */ function work(permit) { if (permit) send(permit, "ok"); }',
  '/** @typedef {AllowEffects} PermissionAlias */ /** @param {PermissionAlias} grant */ function work(grant) { send(grant, "ok"); }',
  'class Lab {\n /** @param {AllowEffects} permit */\n save(permit) { send(permit, "ok"); } }',
  'function pure(name) { return name.toUpperCase(); } pure("hi");',
  '/** @param {AllowEffects} permission */ function work(permission) { send((permission), "ok"); }',
])(
  'explicit current-frame parameters and pure work remain legal: %s',
  source => {
    expect(findings(source)).toEqual([]);
  }
);

test.each([
  '/** @param {AllowEffects} permission */ function work(permission) { return () => send(permission, "captured"); }',
  '/** @param {AllowEffects} permission */ function work(permission) { [1].map(() => send(permission, "captured")); }',
  '/** @param {AllowEffects} permission */ function work(permission) { const alias = permission; send(alias, "hidden"); }',
  '/** @param {{ token: AllowEffects }} deps */ function work(deps) { send(deps.token, "hidden"); }',
  '/** @param {{ token: AllowEffects }} deps */ function work({token}) { send(token, "hidden"); }',
  '/** @type {AllowEffects} */ let globalPermission; function work() { send(globalPermission, "global"); }',
  '/** @param {any} fake */ function work(fake) { send(fake, "forged"); }',
  'function work() { send({}, "forged"); }',
  'function work() { send(); }',
])('capture, aliases, objects, globals and forged values fail: %s', source => {
  expect(findings(source)).toContain('call');
});

test.each([
  'return permission;',
  'return { permission };',
  'return { cached: permission };',
  'const cached = permission;',
  'permission = /** @type {any} */ ({});',
  'let stored; stored = permission;',
  'return (permission);',
  'return [permission];',
  'return /** @type {any} */ (permission);',
])('own-frame tokens cannot be persisted or returned: %s', statement => {
  expect(
    findings(
      `/** @param {AllowEffects} permission */ function work(permission) { ${statement} }`
    )
  ).toContain('stored');
});

test('permission types are discovered through unions and inferred factory aliases', () => {
  expect(
    findings(
      '/** @param {AllowEffects | string} permission */ function work(permission) { return () => permission; }'
    )
  ).toContain('unowned');
  const source =
    'import {createAllowEffects as mint} from "../../../cloud/allow-effects.js"; function work() { const value = mint(); }';
  expect(findings(source)).toContain('mint');
});

test.each([
  'import {createAllowEffects as mint} from "../../../cloud/allow-effects.js";',
  'import * as capabilities from "../../../cloud/allow-effects.js";',
  'export {createAllowEffects} from "../../../cloud/allow-effects.js";',
  'async function work() { return import("../../../cloud/allow-effects.js"); }',
  'const factory = require("../../../cloud/allow-effects.js");',
])(
  'the configured core factory ban rejects imports, re-exports and dynamic access: %s',
  async source => {
    const results = await new ESLint().lintText(source, { filePath: filename });
    expect(
      results[0].messages.some(message =>
        ['no-restricted-imports', 'no-restricted-syntax'].includes(
          message.ruleId
        )
      )
    ).toBe(true);
  }
);

test('compiler providers preserve actual source and only reuse identical snapshots', () => {
  const first = capabilityProgramFor(filename, 'const answer = 1;');
  expect(capabilityProgramFor(filename, 'const answer = 1;')).toBe(first);
  const second = capabilityProgramFor(filename, 'const answer = 2;');
  expect(second).not.toBe(first);
  expect(second.getSourceFile(filename).text).toBe('const answer = 2;');
});

test('core cannot import the local permission boundary either', async () => {
  const results = await new ESLint().lintText(
    'import { bindEffectResponder } from "../../../local/allow-effects.js";',
    { filePath: filename }
  );
  expect(
    results[0].messages.some(
      message => message.ruleId === 'no-restricted-imports'
    )
  ).toBe(true);
});

test('submit-new-page effect callbacks require the owning permission', async () => {
  const results = await new ESLint().lintText(
    `/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */\n/** @param {(permission: AllowEffects, id: string) => void} save */\nfunction submit(save) { save('id'); }`,
    { filePath: submitPageFilename }
  );
  expect(results[0].messages.map(message => message.messageId)).toContain(
    'call'
  );
});

test('missing compiler source fails closed rather than silently skipping ownership checks', () => {
  expect(() => findings('', () => ts.createProgram([], {}))).toThrow(
    'AllowEffects lint requires the current compiler source.'
  );
});

test('mapped nominal permissions cannot conceal closure capture', () => {
  expect(
    findings(
      '/** @param {Readonly<AllowEffects>} permission */ function work(permission) { return () => send(permission, "hidden"); }'
    )
  ).toContain('unowned');
});

test('a compiler graph with no permission definition still checks pure code', () => {
  expect(
    findings('', (name, text) =>
      capabilityProgramFor(
        name,
        text.replace(
          "import('../../../../types/allow-effects').AllowEffects",
          'string'.padEnd(
            "import('../../../../types/allow-effects').AllowEffects".length
          )
        )
      )
    )
  ).toEqual([]);
});

test.each(['const longerName = 1;', 'function different() {}'])(
  'mismatched compiler ranges fail closed: %s',
  replacement => {
    expect(
      findings('send();', name => capabilityProgramFor(name, replacement))
    ).toContain('compiler');
  }
);

test('ignores import.meta identifiers that have no compiler expression node', () => {
  expect(findings('const meta = import.meta.url;')).toEqual([]);
});
