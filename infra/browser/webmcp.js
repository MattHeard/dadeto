import { createWebMcpHandle } from "../core/browser/webmcp.js";

const handle = createWebMcpHandle({
  fetchFn: (...args) => fetch(...args),
  importModule: path => import(path),
  documentObj: globalThis.document,
  locationObj: globalThis.location,
  modelContext: globalThis.document?.modelContext,
  URLCtor: URL,
});

export const { listToys, runToy, registerWebMcpTools } = handle;

handle();
