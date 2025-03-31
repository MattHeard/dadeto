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
