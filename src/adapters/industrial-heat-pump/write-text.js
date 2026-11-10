/**
 * Preserve native conversion and throwing Set semantics, including undefined.
 * @param {Element} element Actual DOM receiver.
 * @param {string|undefined} value Original text payload.
 * @returns {void} Assign textContent through native Set-with-Throw.
 */
export function writeHeatPumpText(element, value) {
  Object.assign(element, { textContent: value });
}
