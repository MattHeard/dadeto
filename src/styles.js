export const styles = `
  body {
    background-color: #121212;
    color: #CCCCCC;
    font-family: "Sono", Consolas, monospace;
    font-size: 16px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  #container {
    max-width: 85ch;
    padding: 1lh;
  }
  .entry {
    display: grid;
    grid-template-columns: 5ch auto;
    padding-bottom: 1em;
    gap: 0em 1em;
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
  }
  p {
    margin: 0;
  }
  ul, .related-links {
    margin: 0;
    padding-left: 20px;
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
    background-color: #1A1A1A;
    color: #CCCCCC;
    padding: 10px;
    overflow-x: auto;
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
  }
  .audio-btn:hover {
    text-decoration: underline;
  }
`;
