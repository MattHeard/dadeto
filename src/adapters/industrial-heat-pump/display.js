import { writeHeatPumpText } from './write-text.js';
/**
 * Bind actual text/list effects without precomputing lazy presentation values.
 * @param {Document} documentObj Actual page document.
 * @returns {{setText:(selector:string,value:string)=>void,renderList:(selector:string,items:string[])=>void}} Bound display capabilities.
 */
export function createHeatPumpDisplayEffects(documentObj) {
  /**
   * @param {string} selector Result selector.
   * @param {string} value Already evaluated projection.
   * @returns {void} Update a present receiver.
   */
  function setText(selector, value) {
    const element = documentObj.querySelector(selector);
    if (element) writeHeatPumpText(element, value);
  }
  /**
   * @param {string} selector List selector.
   * @param {string[]} items Brief entries.
   * @returns {void} Replace a present list in original order.
   */
  function renderList(selector, items) {
    const list = documentObj.querySelector(selector);
    if (!list) return;
    list.replaceChildren(
      ...items.map(item => {
        const entry = documentObj.createElement('li');
        entry.textContent = item;
        return entry;
      })
    );
  }
  return { setText, renderList };
}
