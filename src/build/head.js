import { styles } from './styles.js';

/**
 * Create the <head> section for the generated page.
 * @returns {string} HTML for the head element.
 */
export function headElement() {
  return `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Matt Heard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Sono:wght@200..800&display=swap" rel="stylesheet">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
  <link rel="manifest" href="/site.webmanifest">
  <style>${styles()}</style>
  <script type="module">
    window.interactiveComponents = [];
    window.addComponent = (id, modulePath, functionName) => {
      const component = { id, modulePath, functionName };
      window.interactiveComponents.push(component);
      return component;
    };
  </script>
</head>`;
}
