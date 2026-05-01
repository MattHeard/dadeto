#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import {
  appendNotionCodexReply,
  resolveNotionApiToken,
} from '../src/local/notion-codex/notionApi.js';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit();
}

const message = await resolveMessage(args);
const tokenResult = resolveNotionApiToken({
  tokenEnvNames: args.tokenEnvNames,
});
const response = await appendNotionCodexReply({
  pageId: args.pageId,
  runId: args.runId,
  message,
  token: tokenResult.token,
  notionVersion: args.notionVersion,
});

console.log(JSON.stringify({
  ok: true,
  pageId: args.pageId,
  runId: args.runId,
  tokenEnv: tokenResult.envName,
  commentId: typeof response?.id === 'string' ? response.id : null,
}, null, 2));

function parseArgs(argv) {
  const parsed = {
    help: false,
    message: null,
    messageFile: null,
    notionVersion: undefined,
    pageId: null,
    runId: null,
    tokenEnvNames: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--page-id') {
      index += 1;
      parsed.pageId = argv[index];
    } else if (arg === '--run-id') {
      index += 1;
      parsed.runId = argv[index];
    } else if (arg === '--message') {
      index += 1;
      parsed.message = argv[index];
    } else if (arg === '--message-file') {
      index += 1;
      parsed.messageFile = argv[index];
    } else if (arg === '--token-env') {
      index += 1;
      parsed.tokenEnvNames = [argv[index]];
    } else if (arg === '--notion-version') {
      index += 1;
      parsed.notionVersion = argv[index];
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}

async function resolveMessage(args) {
  if (typeof args.message === 'string') {
    return args.message;
  }

  if (typeof args.messageFile === 'string') {
    return readFile(args.messageFile, 'utf8');
  }

  throw new Error('Either --message or --message-file is required.');
}

function printHelp() {
  console.log(`Usage: node scripts/notion-codex-append-reply.js [options]

Options:
  --page-id <id>           Notion page ID to comment on
  --run-id <id>            Codex poll run ID for the handled marker
  --message <text>         Reply text to comment
  --message-file <path>    Read reply text from a file
  --token-env <name>       Environment variable containing the Notion token
  --notion-version <date>  Notion API version
  -h, --help               Show this help
`);
}
