/**
 * @param {{
 *   config: {
 *     notion: {
 *       dadetoPageId: string,
 *       dadetoPageUrl: string,
 *       taskDataSourceUrl: string,
 *       taskContext: string,
 *       taskStatus: string,
 *       messageSearchQuery: string,
 *       inboxPageIds: string[],
 *       apiTokenEnvNames?: string[]
 *     }
 *   },
 *   repoRoot: string,
 *   runId: string,
 *   nowIso: string
 * }} options Prompt options.
 * @returns {string} Codex prompt for one bounded Notion polling run.
 */
export function buildNotionCodexPrompt(options) {
  const { notion } = options.config;
  const inboxPageList = notion.inboxPageIds.length
    ? notion.inboxPageIds.map(pageId => `- ${pageId}`).join('\n')
    : '- none configured';

  return [
    'You are Codex running as the Dadeto Notion polling worker on lorandil.',
    'Handle at most one unread Notion message or one ready Dadeto task, then stop.',
    '',
    'Notion anchors:',
    `- Dadeto project page ID: ${notion.dadetoPageId}`,
    `- Dadeto project page URL: ${notion.dadetoPageUrl}`,
    `- Dadeto task data source URL: ${notion.taskDataSourceUrl}`,
    `- Inbox candidate page IDs:\n${inboxPageList}`,
    '',
    'Selection order:',
    `1. Read the configured inbox pages and search the Dadeto project for "${notion.messageSearchQuery}".`,
    '2. If a page contains an unhandled message for Codex, add a concise Notion comment reply with the run ID and stop.',
    `3. Otherwise find one Dadeto task where Status is "${notion.taskStatus}" and Context includes "${notion.taskContext}".`,
    `4. If the selected task requires repo work, work in ${options.repoRoot} and follow AGENTS.md, including Beads, tests, commit, and push.`,
    '5. Update the Notion task or page with the outcome, evidence, and any blocker before stopping.',
    '',
    'Reply write path:',
    '- Use Notion connector tools for reads/searches only.',
    '- Do not use Notion connector write/update tools in this background run.',
    '- To reply, write the reply text to a local temp file, then run:',
    '  node scripts/notion-codex-append-reply.js --page-id <page-id> --run-id <run-id> --message-file <file>',
    `- The comment helper reads the Notion API token from ${formatTokenEnvNames(notion.apiTokenEnvNames)}.`,
    '- The helper creates a page-level Notion comment whose text starts with "Codex reply <run-id>".',
    '',
    'Safety rules:',
    '- Do not delete or overwrite existing Notion content.',
    '- Do not handle more than one item in this run.',
    '- If the available work is ambiguous, write a blocker note in Notion and stop.',
    '- Keep replies concise and evidence-driven.',
    '',
    `Run ID: ${options.runId}`,
    `Poll time: ${options.nowIso}`,
  ].join('\n');
}

function formatTokenEnvNames(tokenEnvNames) {
  if (!Array.isArray(tokenEnvNames) || tokenEnvNames.length === 0) {
    return 'NOTION_API_KEY or NOTION_TOKEN';
  }

  return tokenEnvNames.join(' or ');
}
