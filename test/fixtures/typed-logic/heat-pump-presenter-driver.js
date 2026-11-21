import { JSDOM, VirtualConsole } from 'jsdom';

/**
 * Execute the actual page through DOM events and observe only public effects.
 * @param {Function} start Actual browser entry function.
 * @param {string} html Real page template.
 * @param {object} scenario Independent interaction description.
 * @returns {object[]} Ordered externally visible states and effect traces.
 */
export function observeHeatPumpPresenter(start, html, scenario) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error =>
    errors.push({ name: error.name, message: error.message })
  );
  const dom = new JSDOM(html, {
    url: 'https://example.test/industrial-heat-pump-readiness/',
    virtualConsole,
  });
  const { document, Event } = dom.window;
  const downloads = [];
  const effects = [];
  const snapshots = [];
  const observer = scenario.observeWrites
    ? new dom.window.MutationObserver(() => {})
    : null;

  /**
   * Retain stable node identity/content without retaining a live DOM graph.
   * @param {Node} node Actual mutation target or child.
   * @returns {object} Serializable node evidence.
   */
  function describeNode(node) {
    return {
      type: node.nodeType,
      name: node.nodeName,
      id: node.id,
      field: node.getAttribute?.('name'),
      errorFor: node.getAttribute?.('data-error-for'),
      text: node.textContent,
    };
  }

  const formats = [];
  const formatDescriptor = Object.getOwnPropertyDescriptor(
    Intl.NumberFormat.prototype,
    'format'
  );
  if (scenario.observeFormats)
    Object.defineProperty(Intl.NumberFormat.prototype, 'format', {
      ...formatDescriptor,
      get() {
        const original = formatDescriptor.get.call(this);
        const options = this.resolvedOptions();
        return value => {
          formats.push({
            style: options.style,
            currency: options.currency,
            value,
          });
          if (formats.length === scenario.formatFailureAt)
            throw new Error('fixture formatter failure');
          return original(value);
        };
      },
    });
  let stop = () => {};

  /**
   * Capture properties that HTML serialization alone does not retain.
   * @param {string} step Interaction identity.
   * @returns {void}
   */
  function capture(step) {
    snapshots.push({
      step,
      markup: document.body.innerHTML,
      controls: [...document.querySelectorAll('input, select, button')].map(
        element => ({
          tag: element.tagName,
          name: element.name,
          id: element.id,
          value: element.value,
          disabled: element.disabled,
          invalid: element.getAttribute('aria-invalid'),
        })
      ),
      downloads: downloads.map(([payload, filename]) => ({
        payload,
        filename,
      })),
      effects: [...effects],
      errors: [...errors],
      ...(observer
        ? {
            writes: observer.takeRecords().map(record => ({
              type: record.type,
              target: describeNode(record.target),
              attribute: record.attributeName,
              oldValue: record.oldValue,
              added: [...record.addedNodes].map(describeNode),
              removed: [...record.removedNodes].map(describeNode),
            })),
          }
        : {}),
      ...(scenario.observeFormats ? { formats: [...formats] } : {}),
    });
  }

  /**
   * Dispatch the same interaction even for optional or disabled DOM controls.
   * @param {object} operation Fixture action.
   * @returns {void}
   */
  function apply(operation) {
    if (operation.kind === 'input' || operation.kind === 'change') {
      const input = document.querySelector(`[name="${operation.field}"]`);
      if (input) {
        if (operation.asText) input.type = 'text';
        input.value = operation.value;
        input.dispatchEvent(new Event(operation.kind, { bubbles: true }));
      }
    } else if (operation.kind === 'preset') {
      const select = document.querySelector('#scenario-select');
      if (select) {
        const option = document.createElement('option');
        option.value = operation.value;
        select.append(option);
        select.value = operation.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } else if (operation.kind === 'dispose') stop();
    else if (operation.kind === 'submit') {
      const form = document.querySelector('#assumptions-form');
      if (form)
        effects.push({
          submitted: form.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
          ),
        });
    } else {
      const id = {
        export: 'export-button',
        'force-export': 'export-button',
        print: 'print-button',
        reset: 'reset-button',
      }[operation.kind];
      const button = document.getElementById(id);
      if (button) {
        if (operation.kind === 'force-export')
          button.dispatchEvent(new Event('click'));
        else button.click();
      }
    }
  }

  try {
    for (const selector of scenario.missing ?? [])
      document.querySelector(selector)?.remove();
    observer?.observe(document.body, {
      subtree: true,
      attributes: true,
      characterData: true,
      childList: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });
    try {
      stop = start({
        documentObj: document,
        windowObj: dom.window,
        downloadJson: (...args) => downloads.push(args),
        printPage: () => effects.push({ printed: true }),
      });
    } catch (error) {
      errors.push({ name: error.name, message: error.message });
    }
    capture('started');
    const operations = [
      ...scenario.operations,
      { kind: 'submit' },
      { kind: 'export' },
      { kind: 'force-export' },
      { kind: 'print' },
      { kind: 'reset' },
      { kind: 'export' },
      { kind: 'dispose' },
      { kind: 'input', field: 'heatPumpCop', value: '7' },
      { kind: 'submit' },
      { kind: 'reset' },
      { kind: 'force-export' },
      { kind: 'print' },
    ];
    operations.forEach((operation, index) => {
      apply(operation);
      capture(`${index}:${operation.kind}`);
    });
    return snapshots;
  } finally {
    if (scenario.observeFormats)
      Object.defineProperty(
        Intl.NumberFormat.prototype,
        'format',
        formatDescriptor
      );
    observer?.disconnect();
    dom.window.close();
  }
}
