const CONTROL_LABELS = {
  l: 'L',
  zl: 'ZL',
  minus: 'Minus',
  capture: 'Capture',
  stick_press: 'Stick Press',
  dpad_up: 'D-Pad Up',
  dpad_down: 'D-Pad Down',
  dpad_left: 'D-Pad Left',
  dpad_right: 'D-Pad Right',
  stick_left: 'Stick Left',
  stick_right: 'Stick Right',
  stick_up: 'Stick Up',
  stick_down: 'Stick Down',
};

function parseState(inputString) {
  try {
    return JSON.parse(inputString);
  } catch {
    return null;
  }
}

function describeMapping(mapping) {
  if (!mapping) {
    return 'optional';
  }

  if (mapping.type === 'button') {
    return `button ${mapping.index}`;
  }

  return `axis ${mapping.axis} ${mapping.direction === 'negative' ? '-' : '+'}`;
}

function createTextNode(dom, tag, text, className = '') {
  const node = dom.createElement(tag);
  if (className) {
    dom.setClassName(node, className);
  }
  dom.setTextContent(node, text);
  return node;
}

export function createJoyConMappingElement(inputString, dom) {
  const parsed = parseState(inputString);
  if (!parsed) {
    const fallback = dom.createElement('pre');
    dom.setTextContent(fallback, inputString);
    return fallback;
  }

  const root = dom.createElement('div');
  dom.setClassName(root, 'joycon-mapping-output');
  const title = createTextNode(dom, 'h3', 'Joy-Con Mapping');
  const summary = createTextNode(
    dom,
    'p',
    `${Object.keys(parsed.mappings ?? {}).length} mapped, ${(parsed.skippedControls ?? []).length} skipped`
  );
  const list = dom.createElement('div');
  dom.setClassName(list, 'joycon-mapping-list');

  Object.entries(CONTROL_LABELS).forEach(([key, label]) => {
    const row = dom.createElement('div');
    dom.setClassName(row, 'joycon-mapping-row');
    const name = createTextNode(dom, 'strong', label);
    const mapping = parsed.mappings?.[key];
    const valueText = mapping
      ? describeMapping(mapping)
      : parsed.skippedControls?.includes(key)
        ? 'skipped'
        : 'optional';
    const value = createTextNode(dom, 'span', valueText);
    dom.appendChild(row, name);
    dom.appendChild(row, value);
    dom.appendChild(list, row);
  });

  [title, summary, list].forEach(node => dom.appendChild(root, node));
  return root;
}
