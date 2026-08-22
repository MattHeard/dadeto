import { describe, expect, test } from '@jest/globals';
import {
  createJoyConMappingElement,
  joyConMappingTestOnly,
} from '../../src/core/browser/presenters/joyConMapping.js';

const controlKey = {
  stickUp: 'stick_up',
  stickDown: 'stick_down',
  stickRight: 'stick_right',
};

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
        [controlKey.stickUp]: {
          type: 'axis',
          axis: '2',
          direction: 'negative',
        },
        [controlKey.stickDown]: {
          type: 'axis',
          axis: '5',
          direction: 'positive',
        },
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
    expect(summary.tag).toBe('p');
    expect(summary.textContent).toBe('3 mapped, 1 skipped');
    expect(list.tag).toBe('div');
    expect(list.className).toBe('joycon-mapping-list');
    expect(list.children.length).toBeGreaterThan(0);
    expect(list.children.every(row => row.tag === 'div')).toBe(true);
    expect(
      list.children.every(row => row.className === 'joycon-mapping-row')
    ).toBe(true);
    expect(
      list.children.every(row =>
        row.children.every(child => child.className === '')
      )
    ).toBe(true);
    expect(
      list.children.every(
        row => row.children.map(child => child.tag).join(',') === 'strong,span'
      )
    ).toBe(true);

    const findRow = label =>
      list.children.find(row => row.children[0].textContent === label);

    expect(findRow('L').children[1].textContent).toBe('button 1');
    expect(findRow('Stick Up').children[1].textContent).toBe('axis 2 -');
    expect(findRow('Stick Down').children[1].textContent).toBe('axis 5 +');
    expect(findRow('D-Pad Left').children[1].textContent).toBe('skipped');
    expect(findRow('Stick Right').children[1].textContent).toBe('optional');
    expect(findRow('L').children[0].className).toBe('');
    expect(findRow('L').children[1].className).toBe('');
    expect(list.children.map(row => row.children[0].textContent)).toEqual([
      'L',
      'ZL',
      'Minus',
      'Capture',
      'Stick Press',
      'D-Pad Up',
      'D-Pad Down',
      'D-Pad Left',
      'D-Pad Right',
      'Stick Left',
      'Stick Right',
      'Stick Up',
      'Stick Down',
    ]);
  });

  test('falls back to optional text for unknown mapping types without value', () => {
    const dom = createMockDom();
    const payload = {
      mappings: {
        [controlKey.stickRight]: { type: 'mystery' },
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

  test('ignores non-array skipped controls', () => {
    const dom = createMockDom();
    const element = createJoyConMappingElement(
      JSON.stringify({ skippedControls: { 0: 'dpad_left' } }),
      dom
    );
    expect(element.children[1].textContent).toBe('0 mapped, 0 skipped');
    const leftRow = element.children[2].children.find(
      row => row.children[0].textContent === 'D-Pad Left'
    );
    expect(leftRow.children[1].textContent).toBe('optional');
  });

  test('normalizes skipped controls and fallback labels directly', () => {
    expect(
      joyConMappingTestOnly.getSkippedControls({
        skippedControls: ['a', 2, null, 'b'],
      })
    ).toEqual(['a', 'b']);
    expect(
      joyConMappingTestOnly.getSkippedControls({ skippedControls: {} })
    ).toEqual([]);
    expect(joyConMappingTestOnly.createFallbackMapping(false).value).toBe(
      'optional'
    );
    expect(joyConMappingTestOnly.createFallbackMapping(true).value).toBe(
      'skipped'
    );
    expect(joyConMappingTestOnly.getAxisDirectionLabel('negative')).toBe('-');
    expect(joyConMappingTestOnly.getAxisDirectionLabel('positive')).toBe('+');
  });
});
