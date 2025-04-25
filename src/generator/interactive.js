/**
 * Generates the script to register an interactive component within an article
 * @param {string} id - The ID of the article element
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 * @returns {string} - HTML script tag that registers the component
 */
export function generateInteractiveComponentScript(id, modulePath, functionName) {
  return `<script type="module">window.addComponent('${id}', '${modulePath}', '${functionName}');</script>`;
}

/**
 * Generates the basic HTML structure for an interactive component
 * @param {string} id - The ID for the article
 * @param {string} title - The display title for the article
 * @returns {string} - HTML for the component's structure (without the registration script)
 */
export function generateInteractiveComponentHTML(id, title) {
  return `<div class="key article-title">${id}</div><div class="value"><h2><a href="#${id}">${title}</a></h2></div><div class="key">in</div><div class="value"><form><input type="text" disabled></form></div><div class="key"></div><div class="value"><button type="submit" disabled>Submit</button></div><div class="key">out</div><div class="value warning"><p>This toy requires Javascript to run.</p></div>`;
}

/**
 * Generates a complete interactive article with structure and registration script
 * @param {string} id - The ID for the article
 * @param {string} title - The display title for the article
 * @param {string} modulePath - Path to the module containing the processing function
 * @param {string} functionName - Name of the function to import from the module
 * @returns {string} - Complete HTML for the interactive article
 */
export function generateCompleteInteractiveComponent(id, title, modulePath, functionName) {
  const structure = generateInteractiveComponentHTML(id, title);
  const script = generateInteractiveComponentScript(id, modulePath, functionName);

  return structure + script;
}
