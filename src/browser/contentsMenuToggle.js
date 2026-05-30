import { createMobileMenuToggleHandle } from '../core/browser/menu-toggle.js';
import { dom } from './document.js';

const handle = createMobileMenuToggleHandle({
  documentObj: document,
  addKeydownListener: listener => addEventListener('keydown', listener),
  setTimeoutFn: (listener, delay) => dom.setTimeout(listener, delay),
});

handle();
