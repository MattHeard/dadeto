/**
 * @jest-environment jsdom
 */

import { describe, it } from '@jest/globals';
import { createDispose } from '../../src/browser/toys.js';

describe('createDispose', () => {
  it('can be called', () => {
    const dispose = createDispose();
  });
});
