import {
  initAdmin,
  createTriggerStats,
  createRegenerateVariant,
  createShowMessage,
  getStatusParagraph,
} from '../../../../src/core/browser/admin-core.js';

describe('admin/core uncovered branches', () => {
  let mockGoogleAuthModule;
  let mockLoadStaticConfigFn;
  let mockGetAuthFn;
  let mockOnAuthStateChangedFn;
  let mockDoc;
  let mockFetchFn;
  let showMessageCalls;
  let mockShowMessage;

  beforeEach(() => {
    mockGoogleAuthModule = {
      getIdToken: () => 'some-token',
      signOut: () => {},
    };
    mockLoadStaticConfigFn = () => Promise.resolve({});
    mockGetAuthFn = () => ({});
    mockOnAuthStateChangedFn = () => {};

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
        if (id === 'regenInput') {
          // This will be overridden in specific tests
          return { value: '' };
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
    mockShowMessage = text => {
      showMessageCalls.push(text);
      const statusParagraph = mockDoc.getElementById('renderStatus');
      if (statusParagraph) {
        statusParagraph.innerHTML = `<strong>${String(text)}</strong>`;
      }
    };
  });

  it('should throw TypeError if googleAuthModule does not provide initGoogleSignIn', () => {
    expect(() =>
      initAdmin({
        googleAuthModule: mockGoogleAuthModule,
        loadStaticConfigFn: mockLoadStaticConfigFn,
        getAuthFn: mockGetAuthFn,
        onAuthStateChangedFn: mockOnAuthStateChangedFn,
        doc: mockDoc,
        fetchFn: mockFetchFn,
      })
    ).toThrow(
      new TypeError(
        'googleAuthModule must provide an initGoogleSignIn function'
      )
    );
  });

  it('createTriggerStats should report failure when fetchFn throws an error', async () => {
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

  it('createRegenerateVariant should show "Invalid format" if parsePageVariantInput returns null', async () => {
    // Simulate empty input for regenInput
    mockDoc.getElementById = id => {
      if (id === 'regenInput') {
        return { value: '' };
      }
      if (id === 'renderStatus') {
        return { innerHTML: '' };
      }
      return null;
    };

    const regenerateVariant = createRegenerateVariant({
      googleAuth: mockGoogleAuthModule,
      doc: mockDoc,
      showMessage: mockShowMessage,
      getAdminEndpointsFn: () =>
        Promise.resolve({ markVariantDirtyUrl: 'some-url' }),
      fetchFn: mockFetchFn,
    });

    await regenerateVariant({ preventDefault: () => {} });

    expect(showMessageCalls).toContain('Invalid format');
  });

  it('createRegenerateVariant should report failure when sendRegenerateVariantRequest throws an error', async () => {
    mockDoc.getElementById = id => {
      if (id === 'regenInput') {
        return { value: '123abc' }; // Simulate valid input
      }
      if (id === 'renderStatus') {
        return { innerHTML: '' };
      }
      return null;
    };
    mockFetchFn.shouldThrow = true;

    const regenerateVariant = createRegenerateVariant({
      googleAuth: mockGoogleAuthModule,
      doc: mockDoc,
      showMessage: mockShowMessage,
      getAdminEndpointsFn: () =>
        Promise.resolve({ markVariantDirtyUrl: 'some-url' }),
      fetchFn: mockFetchFn,
    });

    await regenerateVariant({ preventDefault: () => {} });

    expect(showMessageCalls).toContain('Regeneration failed');
  });
});
