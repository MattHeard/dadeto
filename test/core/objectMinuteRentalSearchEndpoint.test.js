import {
  LOCAL_OBJECT_MINUTE_RENTAL_SEARCH_ENDPOINT,
  renderObjectMinuteRentalSearchEndpoint,
} from '../../src/core/build/object-minute-rental-search-endpoint.js';

const template =
  '<form data-search-endpoint="{{OBJECT_MINUTE_RENTAL_SEARCH_URL}}"></form>';

describe('renderObjectMinuteRentalSearchEndpoint', () => {
  test('renders the simulator endpoint for local builds', () => {
    expect(
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'local',
      })
    ).toBe(
      `<form data-search-endpoint="${LOCAL_OBJECT_MINUTE_RENTAL_SEARCH_ENDPOINT}"></form>`
    );
  });

  test('renders the configured HTTPS function URL for production builds', () => {
    const endpoint = 'https://rental-search.example.run.app';

    expect(
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'production',
        productionEndpoint: endpoint,
      })
    ).toBe(`<form data-search-endpoint="${endpoint}"></form>`);
  });

  test('fails a production build when the endpoint is missing', () => {
    expect(() =>
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'production',
      })
    ).toThrow('Production rental search endpoint is required.');
  });

  test('rejects non-HTTPS production endpoints', () => {
    expect(() =>
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'production',
        productionEndpoint: 'http://rental-search.example.run.app',
      })
    ).toThrow('Production rental search endpoint must be an HTTPS URL.');
  });

  test('rejects malformed production endpoint URLs', () => {
    expect(() =>
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'production',
        productionEndpoint: 'https://',
      })
    ).toThrow('Production rental search endpoint must be an HTTPS URL.');
  });

  test('rejects unsupported build targets', () => {
    expect(() =>
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'preview',
      })
    ).toThrow('Unsupported rental search build target: preview');
  });

  test('escapes production endpoint query separators for HTML attributes', () => {
    expect(
      renderObjectMinuteRentalSearchEndpoint({
        html: template,
        target: 'production',
        productionEndpoint: 'https://search.example.test/?mode=prod&retry=1',
      })
    ).toBe(
      '<form data-search-endpoint="https://search.example.test/?mode=prod&amp;retry=1"></form>'
    );
  });

  test('fails when the source does not contain exactly one endpoint slot', () => {
    expect(() =>
      renderObjectMinuteRentalSearchEndpoint({
        html: '<form></form>',
        target: 'local',
      })
    ).toThrow('Expected exactly one rental search endpoint placeholder.');
  });
});
