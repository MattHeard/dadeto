import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJson1McpServerHandle } from '../../../src/core/local/json1-mcp-server.js';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);
const serverPath = path.join(projectRoot, 'src/local/json1-mcp-server.js');
let client;

/**
 * Connect to the local JSON1 MCP server over stdio.
 * @returns {Promise<import('@modelcontextprotocol/client').Client>} Connected MCP client.
 */
async function connectClient() {
  client = new Client({ name: 'dadeto-json1-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath],
    cwd: projectRoot,
  });
  await client.connect(transport);
  return client;
}

afterEach(async () => {
  await client?.close();
  client = undefined;
});

describe('Dadeto JSON1 MCP server', () => {
  test('wires the fixed tool through the shared capability factory', () => {
    const registrations = [];
    class FakeMcpServer {
      constructor(metadata) {
        this.metadata = metadata;
      }

      registerTool(name, config, handler) {
        registrations.push({ name, config, handler });
      }
    }
    const serveStdio = factory => factory();
    const z = {
      object: shape => ({ strict: () => ({ shape, strict: true }) }),
      string: () => ({
        describe: description => ({ type: 'string', description }),
      }),
    };
    const invokeCapability = jest.fn(
      ({ capabilityId, input }) => `${capabilityId}:${input}`
    );
    const handle = createJson1McpServerHandle({
      McpServer: FakeMcpServer,
      serveStdio,
      z,
      invokeCapability,
    });
    const server = handle();

    expect(server.metadata).toEqual({ name: 'dadeto-json1', version: '1.0.0' });
    expect(registrations).toHaveLength(1);
    expect(registrations[0].name).toBe('dadeto_canonicalize_json');
    expect(registrations[0].config.inputSchema.strict).toBe(true);
    expect(registrations[0].handler({ input: '{}' })).toEqual({
      content: [
        { type: 'text', text: '{"capabilityId":"JSON1","output":"JSON1:{}"}' },
      ],
    });
    expect(invokeCapability).toHaveBeenCalledWith({
      capabilityId: 'JSON1',
      input: '{}',
    });
  });

  test('publishes only the constrained JSON1 tool schema', async () => {
    const tools = (await (await connectClient()).listTools()).tools;

    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: 'dadeto_canonicalize_json',
      description:
        'Canonicalize valid JSON by recursively sorting object keys while preserving array order.',
      inputSchema: {
        type: 'object',
        required: ['input'],
        additionalProperties: false,
      },
    });
    expect(tools[0].inputSchema.properties).toEqual({
      input: { type: 'string', description: 'JSON text to canonicalize.' },
    });
  });

  test('invokes shared JSON1 behavior through MCP', async () => {
    const result = await (
      await connectClient()
    ).callTool({
      name: 'dadeto_canonicalize_json',
      arguments: { input: '{"z":0,"b":{"y":2,"a":1},"a":3}' },
    });

    expect(JSON.parse(result.content[0].text)).toEqual({
      capabilityId: 'JSON1',
      output:
        '{\n  "a": 3,\n  "b": {\n    "a": 1,\n    "y": 2\n  },\n  "z": 0\n}',
    });
  });

  test('preserves the structured malformed-input result', async () => {
    const result = await (
      await connectClient()
    ).callTool({
      name: 'dadeto_canonicalize_json',
      arguments: { input: '{bad json' },
    });
    const invocation = JSON.parse(result.content[0].text);

    expect(JSON.parse(invocation.output)).toEqual({
      error: 'Invalid JSON input: malformed JSON',
    });
  });

  test('rejects arguments outside the fixed tool schema', async () => {
    const connected = await connectClient();
    const invalidInput = await connected.callTool({
      name: 'dadeto_canonicalize_json',
      arguments: { input: '{}', modulePath: 'src/core/secret.js' },
    });
    expect(invalidInput.isError).toBe(true);
  });
});
