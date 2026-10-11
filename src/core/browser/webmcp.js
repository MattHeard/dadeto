import { invokeCapability } from '../capabilities/index.js';

const MAX_OUTPUT_CHARACTERS = 1500;
/** Shared schema and annotation for read-only tools with no arguments. */
export const READ_ONLY_TOOL = Object.freeze({
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
});
const NON_RUNNABLE_PATH_PARTS = [
  'storage',
  'ledger',
  'game',
  'voice',
  'capture',
  'persistence',
];

/**
 * Read the first prose description, falling back to a post title.
 * @param {Record<string, any>} post Public post.
 * @returns {string} Description.
 */
function getToyDescription(post) {
  return (
    post.content?.find(
      /**
       * @param {unknown} item Content entry.
       * @returns {boolean} Whether this is prose.
       */
      item => typeof item === 'string'
    ) ?? post.title
  );
}

/**
 * Limit execution to text-only toys outside stateful interaction modules.
 * @param {Record<string, any>} post Public post.
 * @returns {boolean} Approved execution capability.
 */
function isRunnableDefinition(post) {
  const toy = post.toy;
  if (
    toy.defaultInputMethod !== 'textarea' ||
    toy.defaultOutputMethod !== 'textarea'
  ) {
    return false;
  }
  return !NON_RUNNABLE_PATH_PARTS.some(part =>
    toy.modulePath.toLowerCase().includes(part)
  );
}

/**
 * Bound tool output without changing serialization of structured toy results.
 * @param {unknown} output Toy result.
 * @returns {{output: string, truncated: boolean, originalLength?: number}} Bounded text.
 */
function boundedOutput(output) {
  const text =
    typeof output === 'string'
      ? output
      : /** @type {string} */ (JSON.stringify(output));
  if (text.length <= MAX_OUTPUT_CHARACTERS) {
    return { output: text, truncated: false };
  }
  return {
    output: text.slice(0, MAX_OUTPUT_CHARACTERS),
    truncated: true,
    originalLength: text.length,
  };
}

/**
 * Serialize a tool result into a text content block.
 * @param {unknown} value Tool result.
 * @returns {{content: Array<{type: string, text: string}>}} Tool content.
 */
export function resultContent(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

/**
 * Preserve the common execution failure envelope across all refusal paths.
 * @param {unknown} toy Requested identifier.
 * @param {string} code Stable failure code.
 * @param {string} message Human-readable reason.
 * @returns {Record<string, any>} Failure result.
 */
function toyFailure(toy, code, message) {
  return { toy, ok: false, error: { code, message } };
}

/**
 * Register each tool through the host's registration method.
 * @param {{registerTool?: (tool: Record<string, any>) => void} | undefined} context WebMCP context.
 * @param {Array<Record<string, any>>} tools Tool definitions.
 * @returns {void}
 */
function registerTools(context, tools) {
  if (!context?.registerTool) {
    return;
  }
  for (const tool of tools) {
    context.registerTool(tool);
  }
}

/**
 * Bind tool definitions to a context-aware registration callback.
 * @param {Array<Record<string, any>>} tools Tool definitions.
 * @returns {(context?: {registerTool?: (tool: Record<string, any>) => void}) => void} Registrar.
 */
function createToolRegistrar(tools) {
  return context => registerTools(context, tools);
}

/**
 * Create the catalog and text-execution tools for a browser environment.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects, ...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>} fetchFn Permission-aware fetch.
 * @param {import('../../../types/allow-effects').AllowEffectsBoundary} bindEffectBoundary Fresh permission boundary.
 * @param {(path: string) => Promise<Record<string, any>>} importModule Toy module loader.
 * @param {(key: string) => string} resolveToyUrl Public toy URL resolver.
 * @returns {{listToys: () => Promise<Array<Record<string, any>>>, runToy: (args: {toy: unknown, input: unknown}) => Promise<Record<string, any>>, register: (context?: {registerTool?: (tool: Record<string, any>) => void}) => void}} Catalog tool controller.
 */
export function createToyTools(
  fetchFn,
  bindEffectBoundary,
  importModule,
  resolveToyUrl
) {
  const toyDefinitions = new Map();
  /** @type {Promise<Map<string, Record<string, any>>> | undefined} */
  let toyDefinitionsPromise;

  /**
   * Fetch and cache the public catalog once per controller.
   * @returns {Promise<Map<string, Record<string, any>>>} Catalog.
   */
  async function loadToyDefinitions() {
    if (!toyDefinitionsPromise) {
      toyDefinitionsPromise = bindEffectBoundary(permission =>
        fetchFn(permission, '/blog.json')
      )
        .then(response => {
          if (!response.ok) {
            throw new Error(`Toy catalog request failed: ${response.status}`);
          }
          return response.json();
        })
        .then(blog => {
          for (const post of blog.posts ?? []) {
            if (!post.toy?.modulePath || !post.toy?.functionName) {
              continue;
            }
            toyDefinitions.set(post.key, {
              key: post.key,
              title: post.title,
              description: getToyDescription(post),
              tags: post.tags ?? [],
              publicationDate: post.publicationDate,
              url: resolveToyUrl(post.key),
              runnable: isRunnableDefinition(post),
              modulePath: post.toy.modulePath,
              functionName: post.toy.functionName,
            });
          }
          return toyDefinitions;
        });
    }
    return toyDefinitionsPromise;
  }

  /**
   * Expose catalog metadata without executable implementation details.
   * @returns {Promise<Array<Record<string, any>>>} Public toy metadata.
   */
  async function listToys() {
    const definitions = await loadToyDefinitions();
    return [...definitions.values()].map(definition => {
      const metadata = { ...definition };
      delete metadata.modulePath;
      delete metadata.functionName;
      return metadata;
    });
  }

  /**
   * Execute an approved toy with bounded output and stable failure codes.
   * @param {{toy: unknown, input: unknown}} args Toy request.
   * @returns {Promise<Record<string, any>>} Execution result.
   */
  async function runToy({ toy, input }) {
    if (typeof toy !== 'string' || typeof input !== 'string') {
      return toyFailure(toy, 'INVALID_INPUT', 'toy and input must be strings.');
    }
    const definition = (await loadToyDefinitions()).get(toy);
    if (!definition) {
      return toyFailure(
        toy,
        'UNKNOWN_TOY',
        'No toy exists with that identifier.'
      );
    }
    if (!definition.runnable) {
      return toyFailure(
        toy,
        'TOY_NOT_RUNNABLE',
        'This toy is not approved for text execution.'
      );
    }
    try {
      const module = await importModule(definition.modulePath);
      const execute = module[definition.functionName];
      if (typeof execute !== 'function') {
        throw new Error('Toy implementation is unavailable.');
      }
      return { toy, ok: true, ...boundedOutput(await execute(input)) };
    } catch (error) {
      return toyFailure(
        toy,
        'TOY_EXECUTION_FAILED',
        error instanceof Error ? error.message : 'Toy execution failed.'
      );
    }
  }

  const register = createToolRegistrar([
    {
      name: 'list_toys',
      description:
        'List the public Matt Heard toys and whether each supports text execution.',
      ...READ_ONLY_TOOL,
      execute: async () => resultContent({ toys: await listToys() }),
    },
    {
      name: 'run_toy',
      description:
        'Run an approved Matt Heard toy with text input and return text output.',
      inputSchema: {
        type: 'object',
        required: ['toy', 'input'],
        additionalProperties: false,
        properties: {
          toy: { type: 'string', description: 'Exact toy identifier.' },
          input: { type: 'string', description: 'Text input for the toy.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: async (/** @type {{toy: unknown, input: unknown}} */ args) =>
        resultContent(await runToy(args)),
    },
  ]);

  return { listToys, runToy, register };
}

/**
 * Create the JSON1 WebMCP tool.
 * @param {typeof invokeCapability} invokeCapabilityFn Shared capability invoker.
 * @returns {(context?: {registerTool?: (tool: Record<string, any>) => void}) => void} Capability tool registrar.
 */
export function createJsonCapabilityTools(
  invokeCapabilityFn = invokeCapability
) {
  const register = createToolRegistrar([
    {
      name: 'dadeto_canonicalize_json',
      description:
        'Canonicalize valid JSON by recursively sorting object keys while preserving array order.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'JSON text to canonicalize.',
          },
        },
        required: ['input'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: (/** @type {{input: unknown}} */ args) =>
        resultContent(invokeJsonCapability(args.input)),
    },
  ]);

  /**
   * Invoke JSON1 through the shared Dadeto capability boundary.
   * @param {unknown} input Candidate JSON string.
   * @returns {{capabilityId: string, output: string} | {error: {code: string, message: string}}} Safe tool result.
   */
  function invokeJsonCapability(input) {
    try {
      return {
        capabilityId: 'JSON1',
        output: invokeCapabilityFn({
          capabilityId: 'JSON1',
          input: /** @type {string} */ (input),
        }),
      };
    } catch (error) {
      const code =
        error?.code === 'INVALID_INVOCATION'
          ? 'INVALID_INVOCATION'
          : 'CAPABILITY_FAILED';
      const message =
        code === 'INVALID_INVOCATION'
          ? 'Capability invocation must include a capability ID and string input.'
          : 'Capability could not be completed.';
      return { error: { code, message } };
    }
  }

  return register;
}

/**
 * Compose independently prepared tool groups for one WebMCP context.
 * @param {{listToys: () => Promise<Array<Record<string, any>>>, runToy: (args: {toy: unknown, input: unknown}) => Promise<Record<string, any>>, register: (context?: {registerTool?: (tool: Record<string, any>) => void}) => void} | undefined} toyTools Catalog controller.
 * @param {((context?: {registerTool?: (tool: Record<string, any>) => void}) => void) | undefined} jsonTools JSON capability registrar.
 * @param {((context?: {registerTool?: (tool: Record<string, any>) => void}) => void) | undefined} pageTools Page registrar.
 * @param {{registerTool?: (tool: Record<string, any>) => void} | undefined} modelContext WebMCP context.
 * @returns {(() => void) & {listToys: () => Promise<Array<Record<string, any>>>, runToy: (args: {toy: unknown, input: unknown}) => Promise<Record<string, any>>, registerWebMcpTools: (context?: {registerTool?: (tool: Record<string, any>) => void}) => void}} Startup handle and public APIs.
 */
export function createWebMcpHandle(
  toyTools,
  jsonTools,
  pageTools,
  modelContext
) {
  /**
   * Register catalog and capability tools for an explicit context.
   * @param {{registerTool?: (tool: Record<string, any>) => void}} [context] Model context.
   * @returns {void}
   */
  function registerWebMcpTools(context = modelContext) {
    toyTools?.register(context);
    jsonTools?.(context);
  }

  /**
   * Register all tools supported by this environment.
   * @returns {void}
   */
  function start() {
    registerWebMcpTools();
    pageTools?.(modelContext);
  }

  return Object.assign(start, {
    listToys: toyTools?.listToys ?? (async () => []),
    runToy: toyTools?.runToy ?? (async () => ({})),
    registerWebMcpTools,
  });
}

/**
 * Create current-page summary and same-origin navigation tools.
 * @param {Document | undefined} documentObj Browser document.
 * @param {Location | undefined} locationObj Browser location.
 * @param {typeof URL} URLCtor URL constructor.
 * @returns {(context?: {registerTool?: (tool: Record<string, any>) => void}) => void} Page tool registrar.
 */
export function createPageTools(documentObj, locationObj, URLCtor) {
  /**
   * Read page metadata only when requested by the registered tool.
   * @returns {Record<string, unknown>} Page metadata.
   */
  function getPageSummary() {
    const document = /** @type {Document} */ (documentObj);
    const location = /** @type {Location} */ (locationObj);
    return {
      title: document.title,
      url: location.href,
      headings: [...document.querySelectorAll('h1, h2')]
        .map(heading => /** @type {string} */ (heading.textContent).trim())
        .filter(Boolean),
      links: [...document.querySelectorAll('a[href]')]
        .map(link => ({
          label: /** @type {string} */ (link.textContent).trim(),
          href: /** @type {HTMLAnchorElement} */ (link).href,
        }))
        .filter(link => link.label),
    };
  }

  /**
   * Navigate only within the current origin.
   * @param {{path: string}} args Relative destination.
   * @returns {{content: Array<{type: string, text: string}>}} Navigation notice.
   */
  function navigateTo({ path }) {
    const location = /** @type {Location} */ (locationObj);
    const target = new URLCtor(path, location.href);
    if (target.origin !== location.origin) {
      throw new Error('Navigation is limited to this site');
    }
    location.assign(target.href);
    return {
      content: [{ type: 'text', text: `Navigating to ${target.pathname}` }],
    };
  }

  const register = createToolRegistrar([
    {
      name: 'get_page_summary',
      description:
        'Read the current page title, headings, and available links.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => resultContent(getPageSummary()),
    },
    {
      name: 'navigate_to',
      description: 'Navigate to a page on this site using a relative path.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'A relative site path.' },
        },
        required: ['path'],
      },
      execute: navigateTo,
    },
  ]);

  return register;
}
