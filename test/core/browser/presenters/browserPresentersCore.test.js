import { describe, expect, jest, test } from '@jest/globals';
import {
  createParsedJsonPresenter,
  createParsedPresenterElement,
  createParagraphElement,
  createPreFromContent,
  createPresenterRoot,
  createSectionWithHeading,
  createSectionWithRows,
  parsePresenterJsonObject,
  renderParsedPresenter,
} from '../../../../src/core/browser/presenters/browserPresentersCore.js';

/**
 *
 */
function createDom() {
  return {
    createElement: jest.fn(tag => ({ tag, children: [] })),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    appendChild: jest.fn((parent, child) => {
      parent.children.push(child);
      return child;
    }),
  };
}

describe('browserPresentersCore', () => {
  test('creates simple elements and section wrappers', () => {
    const dom = createDom();
    const pre = createPreFromContent('hello', dom);
    const paragraph = createParagraphElement('world', dom);
    const root = createPresenterRoot(dom, 'root');
    const section = createSectionWithHeading(dom, 'section', 'Title');
    const content = { tag: 'div', children: [] };
    const rows = createSectionWithRows({
      dom,
      className: 'rows',
      title: 'Rows',
      content,
    });

    expect(pre.textContent).toBe('hello');
    expect(paragraph.textContent).toBe('world');
    expect(root.className).toBe('root');
    expect(section.className).toBe('section');
    expect(rows.children).toContain(content);
  });

  test('renders parsed presenters and falls back when parsing fails', () => {
    const dom = createDom();
    const fallback = jest.fn((inputString, innerDom) => {
      expect(innerDom).toBe(dom);
      return { fallback: inputString };
    });
    const render = jest.fn(parsed => ({ parsed }));

    expect(
      renderParsedPresenter({
        inputString: '{"ok":true}',
        dom,
        parse: input => JSON.parse(input),
        render,
        createFallback: fallback,
      })
    ).toEqual({ parsed: { ok: true } });

    expect(
      createParsedPresenterElement({
        inputString: 'bad json',
        dom,
        parse: () => null,
        render,
        createFallback: fallback,
      })
    ).toEqual({ fallback: 'bad json' });

    const parsedJsonPresenter = createParsedJsonPresenter(parsed => ({
      parsed,
    }));
    expect(parsedJsonPresenter('{"ok":true}', dom)).toEqual({
      parsed: { ok: true },
    });
    expect(parsePresenterJsonObject('{"ok":true}')).toEqual({ ok: true });
    expect(parsePresenterJsonObject('not json')).toBeNull();
  });
});
