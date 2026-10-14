#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { invokeCapability } from '../core/capabilities/index.js';
import { createJson1McpServerHandle } from '../core/local/json1-mcp-server.js';

const handle = createJson1McpServerHandle({
  McpServer,
  serveStdio,
  z,
  invokeCapability,
});

export { handle };

if (process.argv[1] === fileURLToPath(import.meta.url)) handle();
