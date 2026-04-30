/**
 * Return the CSS styles used across generated pages.
 * @returns {string} Inline CSS rules.
 */
export function styles() {
  return `
  :root {
    color-scheme: dark;
    --bg: #121212;
    --terminal-bg: #121212;
    --terminal-fg: #cccccc;
    --terminal-key: #33ccff;
    --terminal-heading: #ffffff;
    --terminal-accent: #00ffff;
    --terminal-hover: #33ffff;
    --terminal-panel: #1a1a1a;
    --terminal-warning: #ffa500;
    --terminal-border: #33ccff;
    --terminal-success: #00ff00;
    --terminal-error: #ff0000;
    --cell-w: 9.64px;
    --cell-h: 18px;
    --cols: 80;
    --rows: 24;
    --font-stack: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    min-height: 100%;
  }

  body {
    background-color: var(--bg);
    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 100% 3px;
    color: var(--terminal-fg);
    font-family: var(--font-stack);
    font-size: 16px;
    line-height: var(--cell-h);
    margin: 0;
    padding: 0;
    overflow-y: auto;
    text-rendering: geometricPrecision;
  }

  #container {
    width: min(100%, calc(var(--cols) * var(--cell-w)));
    min-height: calc(var(--rows) * var(--cell-h));
    margin-inline: auto;
    padding: 0 0 32px;
    background: var(--terminal-bg);
    overflow: hidden;
  }

  .entry {
    display: grid;
    grid-template-columns: 5ch minmax(0, 1fr);
    padding-bottom: 0;
    gap: 0 1ch;
    align-items: start;
    font: 16px / var(--cell-h) var(--font-stack);
    letter-spacing: 0;
    tab-size: 1;
  }

  .entry:first-of-type {
    gap: 0 1ch;
  }

  .entry.nav-entry {
    gap: 0 1ch;
  }

  .key {
    font-weight: 700;
    color: var(--terminal-key);
    text-align: right;
    padding: 0;
    transition: color 120ms ease;
  }

  .entry:hover > .key {
    color: var(--terminal-hover);
  }

  .value {
    text-align: left;
    color: var(--terminal-fg);
    min-width: 0;
  }

  .article-title {
    color: var(--terminal-bg);
    background-color: var(--terminal-accent);
  }

  .media {
    color: var(--terminal-success);
  }

  .footer {
    font-style: italic;
  }

  .full-width {
    white-space: nowrap;
    font-family: var(--font-stack);
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: clip;
    line-height: var(--cell-h);
    color: var(--terminal-accent);
  }

  h1, h2, h3 {
    color: var(--terminal-heading);
    font-size: 16px;
    line-height: var(--cell-h);
    margin: 0;
    text-transform: uppercase;
  }

  img {
    width: auto;
    max-width: min(100%, calc(48 * var(--cell-w)));
    max-height: calc(18 * var(--cell-h));
    height: auto;
    display: block;
    filter: sepia(0.8) hue-rotate(151deg) saturate(2);
    object-fit: contain;
    object-position: top left;
  }

  .value:has(> img),
  .value:has(> audio),
  p.value:has(> iframe) {
    display: block;
    width: min(100%, calc(56 * var(--cell-w)));
    min-height: var(--cell-h);
    padding: var(--cell-h) 1ch;
    background: var(--terminal-panel);
    border: 1px solid var(--terminal-border);
    overflow: hidden;
  }

  p.value:has(> iframe) {
    height: calc(18 * var(--cell-h));
    padding: 0;
  }

  iframe {
    display: block;
    width: 100%;
    height: 100%;
  }

  audio {
    width: min(100%, calc(48 * var(--cell-w)));
    height: calc(2 * var(--cell-h));
    display: block;
  }

  p {
    margin: 0;
  }

  ul, .related-links {
    margin: 0;
    padding-left: 0;
    list-style-type: none;
  }
  
  ul li::before, .related-links li::before {
    content: "- ";
    color: var(--terminal-key);
  }

  a {
    color: var(--terminal-accent);
    text-decoration: none;
  }

  a:hover,
  a:focus {
    color: var(--terminal-hover);
    text-decoration: underline;
    outline: 0;
  }

  h1 > a, h2 > a, h3 > a {
    color: var(--terminal-heading);
  }

  .warning {
    color: var(--terminal-warning);
  }

  .error {
    color: var(--terminal-error);
  }

  .success {
    color: var(--terminal-success);
  }

  .metadata {
    color: var(--terminal-key);
  }

  code {
    background-color: var(--terminal-panel);
    color: var(--terminal-accent);
  }

  pre:not(.header-banner) {
    background: linear-gradient(0deg, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    overflow-x: auto;
    margin: 1.5em 0px;
  }

  .header-banner {
    background: linear-gradient(0deg, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0px;
    margin-bottom: 1em;
    overflow: visible;
  }

  #audio-controls {
    background-color: var(--terminal-panel);
    color: var(--terminal-accent);
    display: inline-block;
  }

  button {
    border: 1px solid var(--terminal-border);
    border-radius: 0;
    padding: 0 1ch;
    min-height: var(--cell-h);
    background: var(--terminal-panel);
    color: var(--terminal-accent);
    cursor: pointer;
    font: inherit;
    line-height: var(--cell-h);
  }

  button:hover {
    text-decoration: underline;
  }

  button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .audio-btn {
    height: 2em;
    margin-right: 1em;
  }

  blockquote {
    font-style: italic;
    padding: 1.5em 2ch;
    margin: 0;
    background-color: #1a1a1a;
    position: relative;
  }

  .corner {
    position: absolute;
    display: block;
    width: 2ch;
    height: 1.5em;
  }

  .corner .h-line,
  .corner .v-line {
    position: absolute;
    background: var(--terminal-fg);
    display: block;
  }

  .h-line {
    height: 2px;
    width: 2ch;
  }

  .v-line {
    width: 2px;
    height: 1.5em;
  }

  .corner-tl {
    top: 0;
    left: 0;
  }

  .corner-tl .h-line {
    top: 0;
    left: 0;
  }

  .corner-tl .v-line {
    top: 0;
    left: 0;
  }

  .corner-tr {
    top: 0;
    right: 0;
  }

  .corner-tr .h-line {
    top: 0;
    right: 0;
  }

  .corner-tr .v-line {
    top: 0;
    right: 0;
  }

  .corner-bl {
    bottom: 0;
    left: 0;
  }

  .corner-bl .h-line {
    bottom: 0;
    left: 0;
  }

  .corner-bl .v-line {
    bottom: 0;
    left: 0;
  }

  .corner-br {
    bottom: 0;
    right: 0;
  }

  .corner-br .h-line {
    bottom: 0;
    right: 0;
  }

  .corner-br .v-line {
    bottom: 0;
    right: 0;
  }

  .release-beta {
    display: none;
  }

  .dendrite-form > div {
    display: flex;
    flex-direction: column;
    margin-bottom: 0.5em;
  }

  .dendrite-form label {
    margin-bottom: 0.25em;
  }

  input:not([type="file"]):not([type="checkbox"]),
  textarea,
  select {
    display: block;
    width: 100%;
    min-height: var(--cell-h);
    background-color: var(--terminal-panel);
    color: var(--terminal-accent);
    border: 1px solid var(--terminal-border);
    border-radius: 0;
    padding: 0 1ch;
    margin: 0;
    font: inherit;
    line-height: var(--cell-h);
    letter-spacing: 0;
    accent-color: var(--terminal-accent);
  }

  input:not([type="file"]):not([type="checkbox"]):focus,
  textarea:focus,
  select:focus {
    outline: 1px solid var(--terminal-hover);
    outline-offset: 0;
  }

  select.input,
  select.output {
    display: inline-block;
    width: auto;
    max-width: 100%;
    margin-right: 1ch;
  }

  input[type="checkbox"] {
    inline-size: 1ch;
    block-size: var(--cell-h);
    margin: 0 1ch 0 0;
    vertical-align: top;
    accent-color: var(--terminal-accent);
  }

  .auto-submit-label {
    display: inline-flex;
    align-items: flex-start;
    min-height: var(--cell-h);
    margin-left: 1ch;
    color: var(--terminal-fg);
  }

  .filter-button {
    cursor: pointer;
    transition: color 120ms ease;
  }

  .filter-button:hover {
    text-decoration: underline;
  }

  .filter-button.active {
    font-weight: bold;
  }

  .toy-textarea {
    display: block;
    width: 100%;
    min-height: calc(6 * var(--cell-h));
    box-sizing: border-box;
  }

  .nav-entry > .key {
    color: var(--terminal-success);
  }
`;
}
