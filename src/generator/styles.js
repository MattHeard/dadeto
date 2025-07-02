export function styles() {
  return `
  body {
    background-color: #121212;
    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
    background-size: 100% 3px;
    color: #CCCCCC;
    font-family: "Sono", Consolas, monospace;
    font-size: 16px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  #container {
    max-width: 85rch;
    padding: 1em 1rch;
  }
  .entry {
    display: grid;
    grid-template-columns: 5ch auto;
    padding-bottom: 1em;
    gap: 0em 1rch;
  }
  .key {
    font-weight: bold;
    color: #33CCFF;
    text-align: right;
    padding: 0em 0em;
  }
  .value {
    text-align: left;
    color: #CCCCCC;
  }
  .article-title {
    color: #121212;
    background-color: #00FFFF;
  }
  .media {
    color: #00FF00;
  }
  .footer {
    font-style: italic;
  }
  .full-width {
    white-space: nowrap;
    font-family: monospace;
    display: block;
    width: 100%;
    overflow: hidden;
    text-overflow: clip;
    line-height: 1;
    color: #00FFFF;
  }

  h1, h2, h3 {
    color: #FFFFFF;
    font-size: 16px;
    margin: 0;
    text-transform: uppercase;
  }
  img {
    max-width: min(20em, 60vw);
    height: auto;
    display: block;
    filter: sepia(0.8) hue-rotate(151deg) saturate(2);
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
    color: #33CCFF;
  }
  a {
    color: #00FFFF;
    text-decoration: none;
  }
  a:hover {
    color: #33FFFF;
    text-decoration: underline;
  }
  h1 > a, h2 > a, h3 > a {
    color: #FFFFFF;
  }

  .warning {
    color: #FFA500;
  }
  .error {
    color: #FF0000;
  }
  .success {
    color: #00FF00;
  }
  .metadata {
    color: #33CCFF;
  }

  code {
    background-color: #1A1A1A;
    color: #00FFFF;
  }
  pre {
    background: linear-gradient(0deg, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    overflow-x: auto;
    margin: 1.5em 0px;
  }
  h1.ascii-art {
    background: linear-gradient(0deg, #00ffff, #ff00ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    overflow-x: auto;
    margin: 1.5em 0px;
    white-space: pre;
  }
  #audio-controls {
    background-color: #1A1A1A;
    color: #00FFFF;
    display: inline-block;
  }
  .audio-btn {
    padding: 0em 1em;
    border: none;
    background: #00FF00;
    color: #1A1A1A;
    font-family: Consolas, monospace;
    cursor: pointer;
    height: 2em;
    margin-right: 1em;
  }
  .audio-btn:hover {
    text-decoration: underline;
  }

  blockquote {
    font-style: italic;
    padding: 1.5em 2ch;
    margin: 0;
    background-color: #1a1a1a;
    position: relative; /* Add this to make absolute positioning of corners work */
  }

  .corner {
    position: absolute;
    display: block; /* Ensure the corners are displayed */
    width: 2ch;
    height: 1.5em;
  }

  .corner .h-line,
  .corner .v-line {
    position: absolute;
    background: #CCCCCC;
    display: block; /* Ensure the lines are displayed */
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

  .dendrite-form input {
    display: block;
    width: 100%;
    margin: 0;
  }
`;
}
