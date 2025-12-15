import { styles } from './styles.js';

/**
 * Create the <head> section for the generated page.
 * Includes fonts, icons, styles and a component registry script.
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
  <!-- Standard favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
  <link rel="icon" href="/favicon.ico" type="image/x-icon">

  <!-- Apple Touch Icon (for iOS home screen) -->
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Android and other platforms -->
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">

  <!-- Web App Manifest (optional but recommended for PWA or better platform integration) -->
  <link rel="manifest" href="/site.webmanifest">
  <style>
    ${styles()}
  </style>
  <!-- Define the component management system in the head -->
  <script type="module">
    // Define array of interactive components to initialize
    window.interactiveComponents = [];
    
    /**
     * Create a function that can add a component to the interactiveComponents list
     * This is defined in the head so it's available as soon as possible
     */
    const createComponentAdder = () => {
      /**
       * Add a component to the interactive components list
       * @param {string} id - The ID of the article element
       * @param {string} modulePath - Path to the module containing the processing function
       * @param {string} functionName - Name of the function to import from the module
       * @returns {Object} The component configuration that was added
       */
      return function addComponent(id, modulePath, functionName) {
        // Create the component configuration
        const component = {
          id,
          modulePath,
          functionName
        };
        
        // Add to the global list
        window.interactiveComponents.push(component);
        
        return component;
      };
    };
    
    // Create the component adder function and expose it globally
    window.addComponent = createComponentAdder();
  </script>
</head>`;
}
