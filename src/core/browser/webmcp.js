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
 * Create isolated catalog, execution, and page tools for one browser environment.
 * @param {{fetchFn: typeof fetch, importModule: (path: string) => Promise<Record<string, any>>, documentObj?: Document, locationObj?: Location, modelContext?: {registerTool?: (tool: Record<string, any>) => void}, URLCtor: typeof URL}} deps Browser adapters.
 * @returns {(() => void) & {listToys: () => Promise<Array<Record<string, any>>>, runToy: (args: {toy: unknown, input: unknown}) => Promise<Record<string, any>>, registerWebMcpTools: (context?: {registerTool?: (tool: Record<string, any>) => void}) => void}} Startup handle and public APIs.
 */
export function createWebMcpHandle({
  fetchFn,
  importModule,
  documentObj,
  locationObj,
  modelContext,
  URLCtor,
}) {
  const toyDefinitions = new Map();
  /** @type {Promise<Map<string, Record<string, any>>> | undefined} */
  let toyDefinitionsPromise;

  /**
   * Fetch and cache the public catalog once per controller.
   * @returns {Promise<Map<string, Record<string, any>>>} Catalog.
   */
  async function loadToyDefinitions() {
    if (!toyDefinitionsPromise) {
      toyDefinitionsPromise = fetchFn('/blog.json')
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
              url: new URLCtor(
                `#${post.key}`,
                locationObj?.href ?? 'https://mattheard.net/'
              ).href,
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

  /**
   * Register the read-only catalog and approved execution tools.
   * @param {{registerTool?: (tool: Record<string, any>) => void}} [context] Model context.
   * @returns {void}
   */
  function registerWebMcpTools(context = modelContext) {
    if (!context?.registerTool) {
      return;
    }
    context.registerTool({
      name: 'list_toys',
      description:
        'List the public Matt Heard toys and whether each supports text execution.',
      ...READ_ONLY_TOOL,
      execute: async () => resultContent({ toys: await listToys() }),
    });
    context.registerTool({
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
    });
  }

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

  /**
   * Register all supported tools without touching pages lacking WebMCP.
   * @returns {void}
   */
  function start() {
    registerWebMcpTools();
    if (!modelContext?.registerTool) {
      return;
    }
    modelContext.registerTool({
      name: 'get_page_summary',
      description:
        'Read the current page title, headings, and available links.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => resultContent(getPageSummary()),
    });
    modelContext.registerTool({
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
    });
  }

  return Object.assign(start, { listToys, runToy, registerWebMcpTools });
}
