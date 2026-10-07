import { createWebMcpHandle } from "../core/browser/webmcp.js";
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

const handle = createWebMcpHandle({
  fetchFn: createEffectFetchFn((...args) => fetch(...args)),
  bindEffectBoundary,
  importModule: path => import(path),
  documentObj: globalThis.document,
  locationObj: globalThis.location,
  modelContext: globalThis.document?.modelContext,
  URLCtor: URL,
});

export const { listToys, runToy, registerWebMcpTools } = handle;

handle();
