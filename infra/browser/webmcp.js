/**
 * Register the safe, read-only tools shared by the blog and Dendrite.
 * WebMCP is an optional browser capability, so ordinary browsers simply skip this module.
 */
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

const modelContext = document.modelContext;
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
