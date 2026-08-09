import {
  createTitleHandle,
  headerBanner,
} from '../../../src/core/build/title.js';

test('creates a title handle exposing the banner renderer', () => {
  expect(createTitleHandle()).toEqual({ headerBanner });
});
