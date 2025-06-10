export function textHandler(dom, container, textInput) {
  dom.reveal(textInput);
  dom.enable(textInput);
  const numberInput = dom.querySelector(container, 'input[type="number"]');
  if (numberInput && typeof numberInput._dispose === 'function') {
    numberInput._dispose();
    dom.removeChild(container, numberInput);
  }
  const kvContainer = dom.querySelector(container, '.kv-container');
  if (kvContainer && typeof kvContainer._dispose === 'function') {
    kvContainer._dispose();
    dom.removeChild(container, kvContainer);
  }
  const dendriteForm = dom.querySelector(container, '.dendrite-form');
  if (dendriteForm && typeof dendriteForm._dispose === 'function') {
    dendriteForm._dispose();
    dom.removeChild(container, dendriteForm);
  }
}
