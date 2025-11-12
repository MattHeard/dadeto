import {
  createTriggerStats,
  createShowMessage,
  getStatusParagraph,
} from '../../../../src/core/browser/admin/core.js';

describe('createTriggerStats', () => {
  let mockGoogleAuthModule;
  let mockFetchFn;
  let showMessageCalls;
  let mockShowMessage;
  let mockDoc;

  beforeEach(() => {
    mockGoogleAuthModule = {
      getIdToken: () => 'some-token',
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
      getElementById: id => {
        if (id === 'renderStatus') {
          return mockRenderStatusElement;
        }
        return null;
      },
    };

    showMessageCalls = [];
    mockShowMessage = text => {
      showMessageCalls.push(text);
      const statusParagraph = mockDoc.getElementById('renderStatus');
      if (statusParagraph) {
        statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
      }
    };
  });

  it('should report failure when fetchFn throws an error', async () => {
    mockFetchFn.shouldThrow = true;

    const triggerStats = createTriggerStats({
      googleAuth: mockGoogleAuthModule,
      getAdminEndpointsFn: () =>
        Promise.resolve({ generateStatsUrl: 'some-url' }),
      fetchFn: mockFetchFn,
      showMessage: mockShowMessage,
    });

    await triggerStats();

    expect(showMessageCalls).toContain('Stats generation failed');
  });
});
