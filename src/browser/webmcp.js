const MAX_OUTPUT_CHARACTERS = 1500;
const toyDefinitions = new Map();
let toyDefinitionsPromise;

const NON_RUNNABLE_PATH_PARTS = [
  'storage', 'ledger', 'game', 'voice', 'capture', 'persistence',
];

function getToyDescription(post) {
  return post.content?.find(item => typeof item === 'string') ?? post.title;
}

function isRunnableDefinition(post) {
  const toy = post.toy;
  if (!toy || toy.defaultInputMethod !== 'textarea' || toy.defaultOutputMethod !== 'textarea') {
    return false;
  }
  return !NON_RUNNABLE_PATH_PARTS.some(part => toy.modulePath.toLowerCase().includes(part));
}

async function loadToyDefinitions() {
  if (!toyDefinitionsPromise) {
    toyDefinitionsPromise = fetch('/blog.json')
      .then(response => {
        if (!response.ok) throw new Error(`Toy catalog request failed: ${response.status}`);
        return response.json();
      })
      .then(blog => {
        for (const post of blog.posts ?? []) {
          if (!post.toy?.modulePath || !post.toy?.functionName) continue;
          toyDefinitions.set(post.key, {
            key: post.key,
            title: post.title,
            description: getToyDescription(post),
            tags: post.tags ?? [],
            publicationDate: post.publicationDate,
            url: new URL(
              `#${post.key}`,
              globalThis.location?.href ?? 'https://mattheard.net/'
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

function boundedOutput(output) {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  if (text.length <= MAX_OUTPUT_CHARACTERS) {
    return { output: text, truncated: false };
  }
  return {
    output: text.slice(0, MAX_OUTPUT_CHARACTERS),
    truncated: true,
    originalLength: text.length,
  };
}

function resultContent(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value) }] };
}

export async function listToys() {
  const definitions = await loadToyDefinitions();
  return [...definitions.values()].map(({ modulePath, functionName, ...metadata }) => metadata);
}

export async function runToy({ toy, input }) {
  if (typeof toy !== 'string' || typeof input !== 'string') {
    return { toy, ok: false, error: { code: 'INVALID_INPUT', message: 'toy and input must be strings.' } };
  }
  const definition = (await loadToyDefinitions()).get(toy);
  if (!definition) {
    return { toy, ok: false, error: { code: 'UNKNOWN_TOY', message: 'No toy exists with that identifier.' } };
  }
  if (!definition.runnable) {
    return { toy, ok: false, error: { code: 'TOY_NOT_RUNNABLE', message: 'This toy is not approved for text execution.' } };
  }
  try {
    const module = await import(definition.modulePath);
    const execute = module[definition.functionName];
    if (typeof execute !== 'function') throw new Error('Toy implementation is unavailable.');
    const bounded = boundedOutput(await execute(input));
    return { toy, ok: true, ...bounded };
  } catch (error) {
    return {
      toy, ok: false,
      error: { code: 'TOY_EXECUTION_FAILED', message: error instanceof Error ? error.message : 'Toy execution failed.' },
    };
  }
}

/** Register safe, read-only tools shared by the blog and Dendrite. */
export function registerWebMcpTools(modelContext = globalThis.document?.modelContext) {
  if (!modelContext?.registerTool) return;
  modelContext.registerTool({
    name: 'list_toys',
    description: 'List the public Matt Heard toys and whether each supports text execution.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: async () => resultContent({ toys: await listToys() }),
  });
  modelContext.registerTool({
    name: 'run_toy',
    description: 'Run an approved Matt Heard toy with text input and return text output.',
    inputSchema: {
      type: 'object', required: ['toy', 'input'], additionalProperties: false,
      properties: { toy: { type: 'string', description: 'Exact toy identifier.' }, input: { type: 'string', description: 'Text input for the toy.' } },
    },
    annotations: { readOnlyHint: true },
    execute: async args => resultContent(await runToy(args)),
  });
}

registerWebMcpTools();

/* Existing shared page tools. */
function getPageSummary() {
  return {
    title: document.title,
    url: window.location.href,
    headings: [...document.querySelectorAll('h1, h2')]
      .map(heading => heading.textContent.trim())
      .filter(Boolean),
    links: [...document.querySelectorAll('a[href]')]
      .map(link => ({ label: link.textContent.trim(), href: link.href }))
      .filter(link => link.label),
  };
}

function navigateTo({ path }) {
  const target = new URL(path, window.location.href);
  if (target.origin !== window.location.origin) {
    throw new Error('Navigation is limited to this site');
  }
  window.location.assign(target.href);
  return { content: [{ type: 'text', text: `Navigating to ${target.pathname}` }] };
}

const modelContext = globalThis.document?.modelContext;
if (modelContext?.registerTool) {
  modelContext.registerTool({
    name: 'get_page_summary',
    description: 'Read the current page title, headings, and available links.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => ({
      content: [{ type: 'text', text: JSON.stringify(getPageSummary()) }],
    }),
  });
  modelContext.registerTool({
    name: 'navigate_to',
    description: 'Navigate to a page on this site using a relative path.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'A relative site path.' } },
      required: ['path'],
    },
    execute: navigateTo,
  });
}
