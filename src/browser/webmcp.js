import {
  createJsonCapabilityTools,
  createPageTools,
  createToyTools,
  createWebMcpHandle,
} from "../core/browser/webmcp.js";
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

const locationObj = globalThis.location;
const handle = createWebMcpHandle(
  createToyTools(
    createEffectFetchFn((...args) => fetch(...args)),
    bindEffectBoundary,
    path => import(path),
    key =>
      new URL(`#${key}`, locationObj?.href ?? 'https://mattheard.net/').href
  ),
  createJsonCapabilityTools(),
  createPageTools(globalThis.document, locationObj, URL),
  globalThis.document?.modelContext
);

export const { listToys, runToy, registerWebMcpTools } = handle;

handle();
