/**
 * Syncs the hidden text input field with the current state of the key-value rows.
 * Only includes non-empty key-value pairs in the output.
 * @param {HTMLInputElement} textInput - The hidden input element to update
 * @param {Object} rows - The key-value pairs to sync
 */
export const syncHiddenField = (textInput, rows) => {
  if (!textInput) {return;}
  // Only include keys with non-empty key or value
  const filtered = {};
  for (const [k, v] of Object.entries(rows)) {
    if (k || v) {filtered[k] = v;}
  }
  textInput.value = JSON.stringify(filtered);
};
