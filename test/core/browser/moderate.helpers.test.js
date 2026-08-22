import { describe, expect, it, jest } from '@jest/globals';
import {
  createTextElement,
  shouldRetryLoad,
  readErrorResponseBody,
  formatHttpErrorMessage,
  createModerateHandle,
  toggleApproveReject,
  appendOptionsList,
  renderVariant,
  startAnimation,
  enableModerationButtons,
  fetchJson,
} from '../../../src/core/browser/moderate.js';

describe('moderate pure helper contracts', () => {
  it('creates text elements with a safe empty fallback', () => {
    const element = { textContent: null };
    const document = { createElement: jest.fn(() => element) };
    createModerateHandle({
      documentObj: document,
      fetchFn: jest.fn(),
      sessionStorageObj: {},
      globalObject: {},
    });
    expect(createTextElement('p', 'hello')).toBe(element);
    expect(element.textContent).toBe('hello');
    expect(createTextElement('span', '')).toBe(element);
    expect(element.textContent).toBe('');
  });

  it('retries only the first HTTP 404 failure', () => {
    expect(shouldRetryLoad(new Error('HTTP 404: missing'), false)).toBe(true);
    expect(shouldRetryLoad(new Error('HTTP 404: missing'), true)).toBe(false);
    expect(shouldRetryLoad(new Error('HTTP 500'), false)).toBe(false);
    expect(shouldRetryLoad({ message: 'HTTP 404: missing' }, false)).toBe(true);
    expect(shouldRetryLoad({ message: 404 }, false)).toBe(false);
    expect(shouldRetryLoad({ message: '' }, false)).toBe(false);
    expect(shouldRetryLoad(null, false)).toBe(false);
  });

  it('reads optional error bodies and handles rejected readers', async () => {
    await expect(readErrorResponseBody({})).resolves.toBe('');
    await expect(
      readErrorResponseBody({ text: () => Promise.resolve('body') })
    ).resolves.toBe('body');
    await expect(
      readErrorResponseBody({ text: () => Promise.reject(new Error('read')) })
    ).resolves.toBe('');
  });

  it('formats trimmed and bounded HTTP error details', () => {
    expect(formatHttpErrorMessage(500, '  failed  ')).toBe('HTTP 500: failed');
    expect(formatHttpErrorMessage(404, '   ')).toBe('HTTP 404');
    expect(formatHttpErrorMessage(500, 'x'.repeat(301))).toBe(
      `HTTP 500: ${'x'.repeat(300)}`
    );
  });

  it('toggles moderation buttons and wires approval callbacks', () => {
    const approve = { disabled: false };
    const reject = { disabled: false };
    const documentObj = {
      getElementById: id => (id === 'approveBtn' ? approve : reject),
    };
    createModerateHandle({
      documentObj,
      fetchFn: jest.fn(),
      sessionStorageObj: {},
      globalObject: {},
    });
    toggleApproveReject(true);
    expect(approve.disabled).toBe(true);
    expect(reject.disabled).toBe(true);
    toggleApproveReject(false);
    expect(approve.disabled).toBe(false);
    expect(reject.disabled).toBe(false);
    expect(approve.disabled).toBe(false);
  });

  it('does not wire incomplete moderation button pairs', () => {
    const approve = { disabled: true };
    const reject = { disabled: true };
    const cases = [
      { approve, reject: null },
      { approve: null, reject },
      { approve: null, reject: null },
    ];
    for (const buttons of cases) {
      createModerateHandle({
        documentObj: {
          getElementById: id => ({ approveBtn: buttons.approve, rejectBtn: buttons.reject }[id] ?? null),
        },
        fetchFn: jest.fn(),
        sessionStorageObj: {},
        globalObject: {},
      });
      enableModerationButtons();
      expect(buttons.approve?.onclick).toBeUndefined();
      expect(buttons.reject?.onclick).toBeUndefined();
    }
  });

  it('safely handles a missing animation element', () => {
    const documentObj = { getElementById: () => null };
    createModerateHandle({ documentObj, fetchFn: jest.fn(), sessionStorageObj: {}, globalObject: {} });
    expect(startAnimation('missing', 'Loading')).toEqual(expect.any(Function));
  });

  it('renders option lists with and without target page numbers', () => {
    const created = [];
    const container = { appendChild: jest.fn(node => created.push(node)) };
    const documentObj = {
      createElement: jest.fn(tag => ({
        tag,
        textContent: '',
        appendChild: jest.fn(),
      })),
      getElementById: () => null,
    };
    createModerateHandle({
      documentObj,
      fetchFn: jest.fn(),
      sessionStorageObj: {},
      globalObject: {},
    });
    appendOptionsList(container, []);
    appendOptionsList(container, null);
    appendOptionsList(container, [{ content: 'Zero', targetPageNumber: 0 }]);
    appendOptionsList(container, [
      { content: 'A', targetPageNumber: 3 },
      { content: 'B' },
    ]);
    expect(created).toHaveLength(2);
    expect(created[0].tag).toBe('ol');
    expect(created[0].appendChild).toHaveBeenCalledTimes(1);
    expect(created[0].appendChild.mock.calls[0][0].textContent).toBe('Zero (0)');
    expect(created[1].appendChild).toHaveBeenCalledTimes(2);
    expect(created[1].appendChild.mock.calls[0][0].textContent).toBe('A (3)');
    expect(created[1].appendChild.mock.calls[1][0].textContent).toBe('B');
  });

  it('renders a variant title, author, content, and options', () => {
    const elements = new Map();
    const pageContent = { style: {}, appendChild: jest.fn(), innerHTML: '' };
    elements.set('pageContent', pageContent);
    elements.set('approveBtn', { disabled: true });
    elements.set('rejectBtn', { disabled: true });
    const documentObj = {
      getElementById: id => elements.get(id) ?? null,
      createElement: tag => ({ tag, textContent: '', appendChild: jest.fn() }),
    };
    createModerateHandle({
      documentObj,
      fetchFn: jest.fn(),
      sessionStorageObj: {},
      globalObject: {},
    });
    renderVariant({
      title: 'Title',
      author: 'Author',
      content: 'Body',
      options: [],
    });
    expect(pageContent.style.display).toBe('');
    expect(pageContent.innerHTML).toBe('');
    expect(pageContent.appendChild).toHaveBeenCalledTimes(3);
    expect(
      pageContent.appendChild.mock.calls.map(([element]) => element.textContent)
    ).toEqual(['Title', 'By Author', 'Body']);
    expect(elements.get('approveBtn').disabled).toBe(false);
    expect(elements.get('rejectBtn').disabled).toBe(false);
  });

  it('renders empty optional fields and requires both action buttons', () => {
    const pageContent = { style: {}, appendChild: jest.fn(), innerHTML: '' };
    const approve = { disabled: true };
    const reject = { disabled: true };
    const documentObj = {
      getElementById: id => ({ pageContent, approveBtn: approve, rejectBtn: reject }[id] ?? null),
      createElement: tag => ({ tag, textContent: '', appendChild: jest.fn() }),
    };
    createModerateHandle({ documentObj, fetchFn: jest.fn(), sessionStorageObj: {}, globalObject: {} });
    renderVariant({});
    expect(pageContent.appendChild.mock.calls.map(([element]) => element.textContent)).toEqual(['', '', '']);
    enableModerationButtons();
    expect(typeof approve.onclick).toBe('function');
    expect(typeof reject.onclick).toBe('function');
  });

  it('fetches JSON and preserves successful response metadata', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ok: true }),
    });
    createModerateHandle({
      documentObj: { createElement: () => ({}) },
      fetchFn,
      sessionStorageObj: {},
      globalObject: {},
    });
    const response = await fetchJson('/ok', { method: 'POST' });
    expect(fetchFn).toHaveBeenCalledWith('/ok', { method: 'POST' });
    expect(response).toMatchObject({ ok: true, status: 201 });
    expect(response.json()).toEqual({ ok: true });
  });

  it('formats failed JSON requests with body, status, and response error details', async () => {
    createModerateHandle({
      documentObj: { createElement: () => ({}) },
      fetchFn: jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => ' unavailable ',
      }),
      sessionStorageObj: {},
      globalObject: {},
    });
    await expect(fetchJson('/failed')).rejects.toMatchObject({
      message: 'HTTP 503: unavailable',
      status: 503,
    });
  });
});
