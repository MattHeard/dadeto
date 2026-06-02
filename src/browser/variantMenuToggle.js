import { createMobileMenuToggleHandle } from '../core/browser/menu-toggle.js';
import { dom } from './document.js';

const addKeydownListener = globalThis.addEventListener.bind(
  globalThis,
  'keydown'
);
const setTimeoutFn = dom.setTimeout.bind(dom);

const handle = createMobileMenuToggleHandle({
  documentObj: document,
  addKeydownListener,
  setTimeoutFn,
});

handle();
