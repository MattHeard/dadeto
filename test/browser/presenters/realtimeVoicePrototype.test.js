import { createRealtimeVoicePrototypeElement } from '../../../src/browser/presenters/realtimeVoicePrototype.js';

/**
 *
 */
/**
 * Create a small DOM facade for presenter rendering tests.
 * @returns {object} DOM facade.
 */
function createDom() {
  return {
    createElement: tagName => ({
      tagName: tagName.toUpperCase(),
      children: [],
      listeners: {},
      prepend(child) {
        this.children.unshift(child);
      },
      addEventListener(event, handler) {
        this.listeners[event] = handler;
      },
    }),
    appendChild: (parent, child) => {
      parent.children.push(child);
      return child;
    },
    setClassName: (element, className) => {
      element.className = className;
    },
    setTextContent: (element, text) => {
      element.textContent = text;
    },
  };
}

describe('createRealtimeVoicePrototypeElement', () => {
  test('renders toy controls without exposing API credentials', () => {
    const dom = createDom();
    const root = createRealtimeVoicePrototypeElement(
      JSON.stringify({
        title: 'Realtime Voice Prototype',
        description: 'Connect over WebRTC.',
        endpoint: 'https://realtime.example.com/api/realtime/call',
        serverLabel: 'cloud server',
      }),
      dom
    );

    const text = JSON.stringify(root);
    expect(root.className).toBe('realtime-voice-toy');
    expect(text).toContain('Connect');
    expect(text).toContain('Disconnect');
    expect(text).toContain('Mute');
    expect(text).toContain('Session server: cloud server');
    expect(text).toContain('Toy controls mounted');
    expect(text).not.toContain('OPENAI_API_KEY');
    expect(text).not.toContain('sk-');
  });
});
