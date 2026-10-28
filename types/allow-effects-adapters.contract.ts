import type { AllowEffects } from './allow-effects.js';
import {
  adaptAllowEffectsBag,
  requireAllowEffects,
} from '../src/adapters/allow-effects.js';

declare const permission: AllowEffects;

const effectful = requireAllowEffects(
  (url: string, init?: { method: string }, ...headers: string[]) =>
    Promise.resolve({ url, init, headers })
);

const accepted: Promise<{
  url: string;
  init: { method: string } | undefined;
  headers: string[];
}> = effectful(permission, '/endpoint', undefined, 'x-one', 'x-two');
void accepted;

// @ts-expect-error A permission is required before raw callable arguments.
effectful('/endpoint');

// @ts-expect-error An ordinary object is not an AllowEffects capability.
effectful({}, '/endpoint');

function receiverCall(this: { readonly prefix: string }, suffix: string) {
  return `${this.prefix}${suffix}`;
}

const receiverEffect = requireAllowEffects(receiverCall);
const receiverResult: string = receiverEffect.call(
  { prefix: 'x' },
  permission,
  '!'
);
void receiverResult;

const storage = adaptAllowEffectsBag(
  {
    getItem: (key: string) => key,
    setItem: (key: string, value: string) => `${key}:${value}`,
    clear: () => undefined,
  },
  { getItem: 'query', setItem: 'effect' } as const
);
const stored: string = storage.getItem('id');
void stored;
const written: string = storage.setItem(permission, 'id', 'token');
void written;

// @ts-expect-error Query methods keep their original signature.
storage.getItem(permission, 'id');

// @ts-expect-error Effect methods require permission first.
storage.setItem('id', 'token');

// @ts-expect-error Unclassified raw methods are absent from the adapted surface.
storage.clear();

const nested = adaptAllowEffectsBag(
  {
    customers: {
      create(this: { readonly prefix: string }, id: string) {
        return `${this.prefix}${id}`;
      },
    },
  },
  { customers: { create: 'effect' } } as const
);
const nestedResult: string = nested.customers.create(permission, 'id');
void nestedResult;

// @ts-expect-error Nested effect methods also require permission.
nested.customers.create('id');

// @ts-expect-error Unknown raw methods cannot be selected.
adaptAllowEffectsBag({ save() {} }, { remove: 'effect' } as const);

// @ts-expect-error Classifications are explicitly limited to query/effect.
adaptAllowEffectsBag({ save() {} }, { save: 'command' } as const);

// Worktree commands and child subscriptions require the invocation capability.
declare const worktree: import('../src/core/scripts/run-stryker-worktree-core.js').WorktreeFilesystem;
const worktreeDirectory: Promise<string> = worktree.mkdtemp(
  permission,
  '/worktree-'
);
void worktreeDirectory;
// @ts-expect-error Filesystem commands cannot omit the invocation capability.
worktree.mkdtemp('/worktree-');
declare const launchWorktree: import('../src/core/scripts/run-stryker-worktree-core.js').WorktreeSpawn;
const childWorktree = launchWorktree(permission, 'node', [], {
  cwd: '.',
  env: {},
  stdio: 'inherit',
});
childWorktree.once(permission, 'exit', code => {
  const status: number | null = code;
  void status;
});
// @ts-expect-error Child event registration is an effect too.
childWorktree.once('exit', () => {});
// @ts-expect-error Launching a child requires the capability as the first argument.
launchWorktree('node', [], { cwd: '.', env: {}, stdio: 'inherit' });

// Package verification queries and diagnostics have explicit platform contracts.
declare const packageVerifier: ReturnType<
  typeof import('../src/core/local/cloud-function-package-closure.js').createCloudFunctionPackageVerifier
>;
declare const packageFilesystem: import('../src/core/local/cloud-function-package-closure.js').VerifierFilesystem;
packageVerifier.inspectCloudFunctionPackage('/package', packageFilesystem);
packageVerifier.main(permission, {
  rootDirectory: '/workspace',
  fileSystem: packageFilesystem,
});
// @ts-expect-error Inspection cannot fall back to an ambient filesystem.
packageVerifier.inspectCloudFunctionPackage('/package');
// @ts-expect-error Diagnostic-producing invocation requires its permission.
packageVerifier.main({
  rootDirectory: '/workspace',
  fileSystem: packageFilesystem,
});
// @ts-expect-error Runtime invocation cannot omit the explicit root and filesystem.
packageVerifier.main(permission);

// Storage keeps caller-supplied byte types without requiring the Node Buffer API.
import { createFakeStorageClass } from '../src/core/local/gcp-simulator/fake-storage.js';
class ContractStorageBytes extends Uint8Array {
  decode(): string {
    return 'decoded';
  }
}
const ContractStorage = createFakeStorageClass({
  fileSystem: {
    mkdir: async () => undefined,
    writeFile: async () => undefined,
    stat: async () => ({}),
    readFile: async () => new ContractStorageBytes([1]),
  },
  paths: { join: (...parts) => parts.join('/'), dirname: value => value },
  toBytes: () => new ContractStorageBytes([1]),
  bindEffectBoundary: async handler => handler(permission),
});
const contractStorageFile = new ContractStorage({ rootDir: '/storage' })
  .bucket('bucket')
  .file('file');
contractStorageFile.download().then(values => {
  const decoded: string = values[0].decode();
  void decoded;
});
// @ts-expect-error Storage class composition cannot omit platform/effects dependencies.
createFakeStorageClass({});
// @ts-expect-error Storage clients require an explicit root.
new ContractStorage({});
declare const storagePorts: Parameters<typeof createFakeStorageClass>[0];
storagePorts.fileSystem.writeFile(permission, '/file', new Uint8Array([1]));
// @ts-expect-error Native write capabilities require the invocation permission.
storagePorts.fileSystem.writeFile('/file', new Uint8Array([1]));

// The lazy simulator entrypoint also requires permission for its startup adapter.
import { createSimulatorHandle } from '../src/core/local/gcp-simulator/simulator-entrypoint.js';
declare const simulatorConstructor: Parameters<typeof createSimulatorHandle>[0];
simulatorConstructor(permission, {});
// @ts-expect-error Startup construction cannot omit its permission.
simulatorConstructor({});
// @ts-expect-error Ordinary objects are not startup effect capabilities.
simulatorConstructor({}, {});
// @ts-expect-error A scoped runtime boundary is required when composing startup.
createSimulatorHandle(simulatorConstructor, {});

// Build table source capabilities are required; no ambient filesystem defaults.
import { createStaticJsonlTable } from '../src/core/build/staticJsonlTable.js';
const portableTables = createStaticJsonlTable({
  fileSystem: { readFileSync: () => '{"score":1}' },
  paths: { resolve: (...parts) => parts.join('|'), isAbsolute: () => false },
  defaultDataRoot: 'catalog',
});
const portableTableHtml: string = portableTables.renderStaticJsonlTable({
  source: 'rows.jsonl',
  columns: ['score'],
});
void portableTableHtml;
// @ts-expect-error No implicit host filesystem or root.
createStaticJsonlTable();
// @ts-expect-error Every source capability and default root is required.
createStaticJsonlTable({ fileSystem: { readFileSync: () => '' } });

// Billing purchase UUID generation is an explicit permission-first capability.
import { createBillingRuntime } from '../src/core/cloud/billing/billing-runtime-core.js';
declare const purchaseIdProvider: Parameters<
  typeof createBillingRuntime
>[1]['randomUUID'];
const purchaseId: string = purchaseIdProvider(permission);
void purchaseId;
// @ts-expect-error Generating an ID requires the current request permission.
purchaseIdProvider();
// @ts-expect-error Plain objects cannot authorize ID generation.
purchaseIdProvider({});
// @ts-expect-error Core billing cannot silently supply a native UUID implementation.
createBillingRuntime({});
// @ts-expect-error Runtime configuration requires its UUID capability.
createBillingRuntime({}, { billingEnabled: false });
createBillingRuntime({}, { randomUUID: purchaseIdProvider });
