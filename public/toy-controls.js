/**
 * Enable controls and update status message for an interactive component
 * @param {HTMLInputElement} inputElement
 * @param {HTMLButtonElement} submitButton
 * @param {HTMLElement} outputElement
 */
export function enableInteractiveControls(inputElement, submitButton, outputElement) {
  inputElement.disabled = false;
  submitButton.disabled = false;
  outputElement.textContent = 'Ready for input';
  outputElement.parentElement.classList.remove('warning');
}

/**
 * Creates a submit handler function for an interactive toy.
 * @param {HTMLInputElement} inputElement - The input field.
 * @param {HTMLElement} outputElement - The element to display output/errors.
 * @param {object} globalState - The shared application state.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {Function} stopDefault - Function to prevent default event action.
 * @param {Function} createEnv - Function to create the environment map for the toy.
 * @param {Function} errorFn - Function for logging errors.
 * @param {Function} addWarningFn - Function to add a warning style to the output.
 * @returns {Function} An event handler function.
 */
export const createHandleSubmit = (inputElement, outputElement, globalState, processingFunction, stopDefault, createEnv, errorFn, addWarningFn) => (event) => {
  if (event) {
    stopDefault(event);
  }
  const inputValue = inputElement.value;
  
  try {
    const env = createEnv(globalState);
    
    // Call the processing function with the input value
    const result = processingFunction(inputValue, env);
    
    // Update the output
    outputElement.textContent = result;
  } catch (e) {
    errorFn('Error processing input:', e);
    outputElement.textContent = 'Error: ' + e.message;
    addWarningFn(outputElement);
  }
};

/**
 * Initializes the interactive elements (input, button, output) within a toy's article element.
 * Sets up event listeners and initial state.
 * @param {HTMLElement} article - The article element containing the toy.
 * @param {Function} processingFunction - The toy's core logic function.
 * @param {Function} querySelectorFn - Function to find elements within the article.
 * @param {object} globalState - The shared application state.
 * @param {Function} stopDefaultFn - Function to prevent default event action.
 * @param {Function} createEnvFn - Function to create the environment map for the toy.
 * @param {Function} errorFn - Function for logging errors.
 * @param {Function} addWarningFn - Function to add a warning style to the output.
 * @param {Function} addEventListenerFn - Function to add event listeners.
 */
export function initializeInteractiveComponent(article, processingFunction, querySelectorFn, globalState, stopDefaultFn, createEnvFn, errorFn, addWarningFn, addEventListenerFn) {
  // Get the elements within the article
  const inputElement = querySelectorFn(article, 'input');
  const submitButton = querySelectorFn(article, 'button');
  const outputElement = querySelectorFn(article, 'p.output');
  
  // Disable controls during initialization
  inputElement.disabled = true;
  submitButton.disabled = true;
  
  // Update message to show JS is running
  outputElement.textContent = 'Initialising...';

  // Create the submit handler using the function from this module
  const handleSubmit = createHandleSubmit(inputElement, outputElement, globalState, processingFunction, stopDefaultFn, createEnvFn, errorFn, addWarningFn);

  // Add event listener to the submit button
  addEventListenerFn(submitButton, 'click', handleSubmit);
  
  // Add event listener for Enter key in the input field
  addEventListenerFn(inputElement, 'keypress', (event) => {
    if (event.key === 'Enter') {
      handleSubmit(event); // Use the created handleSubmit
    }
  });

  // Enable controls when initialization is complete using the function from this module
  enableInteractiveControls(inputElement, submitButton, outputElement);
}
