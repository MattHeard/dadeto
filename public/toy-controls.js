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
