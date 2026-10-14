/**
 * Create the JSON1 MCP stdio server handler.
 * @param {{McpServer: new (metadata: {name: string, version: string}) => {registerTool: (name: string, config: object, handler: (args: {input: string}) => object) => unknown}, serveStdio: (factory: () => unknown) => unknown, z: {object: (shape: object) => {strict: () => unknown}, string: () => {describe: (description: string) => unknown}}, invokeCapability: (invocation: {capabilityId: string, input: string}) => string}} deps MCP SDK and shared capability dependencies.
 * @returns {() => unknown} Process entrypoint.
 */
export function createJson1McpServerHandle({
  McpServer,
  serveStdio,
  z,
  invokeCapability,
}) {
  const createServer = () => {
    const server = new McpServer({ name: 'dadeto-json1', version: '1.0.0' });
    server.registerTool(
      'dadeto_canonicalize_json',
      {
        description:
          'Canonicalize valid JSON by recursively sorting object keys while preserving array order.',
        inputSchema: z
          .object({
            input: z.string().describe('JSON text to canonicalize.'),
          })
          .strict(),
        annotations: { readOnlyHint: true },
      },
      ({ input }) => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              capabilityId: 'JSON1',
              output: invokeCapability({ capabilityId: 'JSON1', input }),
            }),
          },
        ],
      })
    );
    return server;
  };

  return () => serveStdio(createServer);
}
