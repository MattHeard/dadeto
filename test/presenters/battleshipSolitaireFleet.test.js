import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { createBattleshipFleetBoardElement } from '../../src/core/presenters/battleshipSolitaireFleet.js';

describe('createBattleshipFleetBoardElement', () => {
  // Mock dom abstraction
  let dom;
  beforeEach(() => {
    dom = {
      createElement: jest.fn(tag => ({
        tag,
        text: '',
        children: [],
        setText: function (t) {
          this.text = t;
        },
      })),
      setTextContent: jest.fn((el, text) => {
        el.text = text;
      }),
    };
  });

  test('renders a valid fleet as a <pre> element', () => {
    const fleet = {
      width: 4,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { start: { x: 2, y: 2 }, length: 2, direction: 'V' },
      ],
    };
    const input = JSON.stringify(fleet);
    // Patch dom.createElement to recognize 'pre'
    dom.createElement = jest.fn(tag => ({
      tag,
      text: '',
      children: [],
      setText: function (t) {
        this.text = t;
      },
    }));
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    // Should render a grid with '#' for ships and '·' for water
    // Horizontal ship at (0,0)-(1,0), vertical at (2,2)-(2,3) (but height is 3, so only (2,2))
    // The grid:
    // ##··
    // ····
    // ··#·
    expect(dom.setTextContent).toHaveBeenCalled();
    const gridString = dom.setTextContent.mock.calls[0][1];
    const lines = gridString.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0].replace(/ /g, '')).toBe('##··');
    expect(lines[1].replace(/ /g, '')).toBe('····');
    expect(lines[2].replace(/ /g, '')).toBe('··#·');
  });

  test('renders a vertical ship occupying multiple rows', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [{ start: { x: 1, y: 0 }, length: 3, direction: 'V' }],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines).toEqual(['· # ·', '· # ·', '· # ·']);
  });

  test('renders a 10x10 empty fleet for invalid JSON', () => {
    const el = createBattleshipFleetBoardElement('not json', dom);
    expect(el.tag).toBe('pre');
    // Check for a 10x10 grid of water symbols
    const lines = el.text.trim().split('\n');
    expect(lines).toHaveLength(10);
    for (const line of lines) {
      expect(line.replace(/ /g, '')).toBe('··········');
    }
  });

  test('returns <p> with error for missing width', () => {
    const fleet = { height: 3, ships: [] };
    const el = createBattleshipFleetBoardElement(JSON.stringify(fleet), dom);
    expect(el.tag).toBe('p');
    expect(el.text).toMatch(/width/i);
  });

  test('returns <p> with error for missing height', () => {
    const fleet = { width: 3, ships: [] };
    const el = createBattleshipFleetBoardElement(JSON.stringify(fleet), dom);
    expect(el.tag).toBe('p');
    expect(el.text).toMatch(/height/i);
  });

  test('returns <p> with error for missing ships', () => {
    const fleet = { width: 3, height: 3 };
    const el = createBattleshipFleetBoardElement(JSON.stringify(fleet), dom);
    expect(el.tag).toBe('p');
    expect(el.text).toMatch(/ships/i);
  });

  test('skips malformed ships and still renders valid ones', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { start: { x: 1 }, length: 2, direction: 'V' }, // malformed
      ],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const gridString = dom.setTextContent.mock.calls[0][1];
    expect(gridString).toContain('# # ·');
  });

  test('skips ships with non-number x coordinate', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { start: { x: '1', y: 1 }, length: 2, direction: 'V' }, // malformed x
      ],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines[0].replace(/ /g, '')).toBe('##·');
    expect(lines[1].replace(/ /g, '')).toBe('···');
    expect(lines[2].replace(/ /g, '')).toBe('···');
  });

  test.each([
    [
      'first',
      [
        { start: { x: 0, y: 0 }, length: '2', direction: 'H' },
        { start: { x: 1, y: 1 }, length: 2, direction: 'V' },
      ],
      ['···', '·#·', '·#·'],
    ],
    [
      'second',
      [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { start: { x: 1, y: 1 }, length: '2', direction: 'H' },
      ],
      ['##·', '···', '···'],
    ],
  ])(
    'skips ships with non-number length (%s invalid)',
    (_, ships, expected) => {
      const fleet = { width: 3, height: 3, ships };
      const input = JSON.stringify(fleet);
      const el = createBattleshipFleetBoardElement(input, dom);
      expect(el.tag).toBe('pre');
      const lines = el.text
        .trim()
        .split('\n')
        .map(l => l.replace(/ /g, ''));
      expect(lines).toEqual(expected);
    }
  );

  test('skips ships missing the start property', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { length: 2, direction: 'V' }, // malformed, missing start
      ],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines[0].replace(/ /g, '')).toBe('##·');
    expect(lines[1].replace(/ /g, '')).toBe('···');
    expect(lines[2].replace(/ /g, '')).toBe('···');
  });

  test('ignores ship segments that exceed board dimensions', () => {
    const fleet = {
      width: 2,
      height: 2,
      ships: [{ start: { x: 1, y: 0 }, length: 2, direction: 'H' }],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(line.split(' ')).toHaveLength(2);
    }
    expect(lines[0].replace(/ /g, '')).toBe('·#');
    expect(lines[1].replace(/ /g, '')).toBe('··');
  });

  test('ignores ships with negative start coordinates', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [{ start: { x: -1, y: 1 }, length: 2, direction: 'H' }],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines).toEqual(['· · ·', '# · ·', '· · ·']);
  });

  test('ignores ships with negative start row', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [{ start: { x: 1, y: -1 }, length: 2, direction: 'V' }],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines).toEqual(['· # ·', '· · ·', '· · ·']);
  });

  test('skips ships with invalid direction', () => {
    const fleet = {
      width: 3,
      height: 3,
      ships: [
        { start: { x: 0, y: 0 }, length: 2, direction: 'H' },
        { start: { x: 1, y: 1 }, length: 2, direction: 'X' },
      ],
    };
    const input = JSON.stringify(fleet);
    const el = createBattleshipFleetBoardElement(input, dom);
    expect(el.tag).toBe('pre');
    const lines = el.text.trim().split('\n');
    expect(lines[0].replace(/ /g, '')).toBe('##·');
    expect(lines[1].replace(/ /g, '')).toBe('···');
    expect(lines[2].replace(/ /g, '')).toBe('···');
  });
});
