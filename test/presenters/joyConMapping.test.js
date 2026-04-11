import { describe, expect, test } from '@jest/globals';
import { createJoyConMappingElement } from '../../src/core/browser/presenters/joyConMapping.js';

/**
 * Build a minimal DOM facade for presenter tests.
 * @returns {{ createElement: (tag: string) => { tag: string, className: string, textContent: string, children: unknown[] }, setClassName: (node: { className: string }, className: string) => void, setTextContent: (node: { textContent: string }, text: string) => void, appendChild: (parent: { children: unknown[] }, child: unknown) => void }} DOM mock.
 */
function createMockDom() {
  return {
    createElement: tag => ({
      tag,
      className: '',
      textContent: '',
      children: [],
    }),
    setClassName: (node, className) => {
      node.className = className;
    },
    setTextContent: (node, text) => {
      node.textContent = text;
    },
    appendChild: (parent, child) => {
      parent.children.push(child);
    },
  };
}

describe('createJoyConMappingElement', () => {
  test('returns a fallback pre element when JSON is invalid', () => {
    const dom = createMockDom();
    const input = 'not json';

    const result = createJoyConMappingElement(input, dom);

    expect(result.tag).toBe('pre');
    expect(result.textContent).toBe(input);
  });

  test('renders the mapping summary and correct values for each control', () => {
    const dom = createMockDom();
    const payload = {
      mappings: {
        l: { type: 'button', index: 1 },
        stick_up: { type: 'axis', axis: '2', direction: 'negative' },
        stick_down: { type: 'axis', axis: '5', direction: 'positive' },
      },
      skippedControls: ['dpad_left'],
    };
    const element = createJoyConMappingElement(JSON.stringify(payload), dom);
    const [title, summary, list] = element.children;

    expect(element.tag).toBe('div');
    expect(element.className).toBe('joycon-mapping-output');
    expect(title.tag).toBe('h3');
    expect(title.textContent).toBe('Joy-Con Mapping');
    expect(title.className).toBe('joycon-mapping-title');
    expect(summary.className).toBe('joycon-mapping-summary');
    expect(summary.textContent).toBe('3 mapped, 1 skipped');
    expect(list.tag).toBe('div');
    expect(list.className).toBe('joycon-mapping-list');
    expect(list.children.length).toBeGreaterThan(0);

    const findRow = label =>
      list.children.find(row => row.children[0].textContent === label);

    expect(findRow('L').children[1].textContent).toBe('button 1');
    expect(findRow('Stick Up').children[1].textContent).toBe('axis 2 -');
    expect(findRow('Stick Down').children[1].textContent).toBe('axis 5 +');
    expect(findRow('D-Pad Left').children[1].textContent).toBe('skipped');
    expect(findRow('Stick Right').children[1].textContent).toBe('optional');
    expect(findRow('L').children[0].className).toBe('');
    expect(findRow('L').children[1].className).toBe('');
  });

  test('falls back to optional text for unknown mapping types without value', () => {
    const dom = createMockDom();
    const payload = {
      mappings: {
        stick_right: { type: 'mystery' },
      },
      skippedControls: [],
    };
    const element = createJoyConMappingElement(JSON.stringify(payload), dom);
    const [, summary, list] = element.children;

    expect(summary.textContent).toBe('1 mapped, 0 skipped');

    const findRow = label =>
      list.children.find(row => row.children[0].textContent === label);

    expect(findRow('Stick Right').children[1].textContent).toBe('optional');
  });

  test('renders zero mappings when payload lacks arrays or mappings', () => {
    const dom = createMockDom();
    const payload = {
      skippedControls: null,
    };
    const element = createJoyConMappingElement(JSON.stringify(payload), dom);
    const [, summary, list] = element.children;

    expect(summary.textContent).toBe('0 mapped, 0 skipped');
    expect(list.children[0].children[1].textContent).toBe('optional');
  });
});
