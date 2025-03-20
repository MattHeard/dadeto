import { styles } from './styles.js';

export const headElement = `<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
  <title>Matt Heard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Sono:wght@200..800&display=swap" rel="stylesheet">
  <style>
    ${styles}
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
