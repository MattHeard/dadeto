import { startOpenAIChatPage } from '/browser/openaiChat.js';

const dispose = startOpenAIChatPage({
  documentObj: document,
  windowObj: window,
});

window.addEventListener('pagehide', dispose, { once: true });
