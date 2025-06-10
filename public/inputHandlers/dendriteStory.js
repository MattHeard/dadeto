export function dendriteStoryHandler(dom, container, textInput) {
  dom.hide(textInput);
  dom.disable(textInput);

  const existing = dom.querySelector(container, '.dendrite-form');
  if (existing) {
    if (typeof existing._dispose === 'function') {
      existing._dispose();
    }
    dom.removeChild(container, existing);
  }

  const form = dom.createElement('div');
  dom.setClassName(form, 'dendrite-form');
  const nextSibling = dom.getNextSibling(textInput);
  dom.insertBefore(container, form, nextSibling);

  const disposers = [];
  const data = {};
  const fields = [
    ['title', 'Title'],
    ['content', 'Content'],
    ['firstOption', 'First option'],
    ['secondOption', 'Second option'],
    ['thirdOption', 'Third option'],
    ['fourthOption', 'Fourth option'],
  ];

  fields.forEach(([key, placeholder]) => {
    const input = dom.createElement('input');
    dom.setType(input, 'text');
    dom.setPlaceholder(input, placeholder);
    const onInput = () => {
      data[key] = dom.getValue(input);
      dom.setValue(textInput, JSON.stringify(data));
    };
    dom.addEventListener(input, 'input', onInput);
    disposers.push(() => dom.removeEventListener(input, 'input', onInput));
    dom.appendChild(form, input);
  });

  form._dispose = () => {
    disposers.forEach(fn => fn());
  };

  return form;
}
