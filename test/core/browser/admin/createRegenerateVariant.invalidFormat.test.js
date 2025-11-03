import {
  createRegenerateVariant,
  createShowMessage,
  getStatusParagraph,
} from '../../../../src/core/browser/admin/core.js';

describe('createRegenerateVariant', () => {
  let mockGoogleAuthModule;
  let mockDoc;
  let mockFetchFn;
  let showMessageCalls;
  let mockShowMessage;
  let mockRegenInputElement;

  beforeEach(() => {
    mockGoogleAuthModule = {
      getIdToken: () => 'some-token',
    };

    mockRegenInputElement = { value: '' };

    const mockRenderStatusElement = {
      _innerHTML: '',
      set innerHTML(value) {
        this._innerHTML = value;
      },
      get innerHTML() {
        return this._innerHTML;
      },
    };

    mockDoc = {
      getElementById: (id) => {
        if (id === 'renderStatus') {
          return mockRenderStatusElement;
        }
        if (id === 'regenInput') {
          return mockRegenInputElement;
        }
        return null;
      },
      querySelectorAll: () => [],
    };

    mockFetchFn = (url, options) => {
      mockFetchFn.calls.push({ url, options });
      if (mockFetchFn.shouldThrow) {
        return Promise.reject(new Error('Fetch error'));
      }
      return Promise.resolve({ ok: true });
    };
    mockFetchFn.calls = [];
    mockFetchFn.shouldThrow = false;

    showMessageCalls = [];
    mockShowMessage = (text) => {
      showMessageCalls.push(text);
      const statusParagraph = mockDoc.getElementById('renderStatus');
      if (statusParagraph) {
        statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
      }
    };
  });

  it('should show "Invalid format" if parsePageVariantInput returns null', async () => {
    mockRegenInputElement.value = ''; // Simulate empty input

    const regenerateVariant = createRegenerateVariant(
      mockGoogleAuthModule,
      mockDoc,
      mockShowMessage,
      () => Promise.resolve({ markVariantDirtyUrl: 'some-url' }),
      mockFetchFn
    );

    await regenerateVariant({ preventDefault: () => {} });

    expect(showMessageCalls).toContain('Invalid format');
  });
});