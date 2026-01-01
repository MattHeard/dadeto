import { describe, it, expect } from '@jest/globals';
import {
  parseCsvLine,
  TOYS_CORE_REEXPORT_MARKER,
} from '../../src/core/browser/toys/2025-10-19/toys-core.js';
import {
  calculateVisibility,
  TOYS_2025_12_05_INDEX_MARKER,
} from '../../src/core/browser/toys/2025-12-05/index.js';
import {
  isNonNullObject,
  CLOUD_COMMON_CORE_MARKER,
} from '../../src/core/cloud/common-core.js';
import {
  createVerifyAdmin as createStatsVerifyAdmin,
  GENERATE_STATS_VERIFY_ADMIN_MARKER,
} from '../../src/core/cloud/generate-stats/verifyAdmin.js';
import {
  createVerifyAdmin as createMarkVerifyAdmin,
  MARK_VARIANT_DIRTY_VERIFY_ADMIN_MARKER,
} from '../../src/core/cloud/mark-variant-dirty/verifyAdmin.js';
import {
  createDb,
  API_KEY_CREDIT_CREATE_DB_MARKER,
} from '../../src/core/cloud/get-api-key-credit/create-db.js';

describe('re-export coverage', () => {
  it('exposes the toy csv helpers', () => {
    expect(typeof parseCsvLine).toBe('function');
    expect(TOYS_CORE_REEXPORT_MARKER).toBe(true);
  });

  it('exposes calculateVisibility', () => {
    expect(typeof calculateVisibility).toBe('function');
    expect(TOYS_2025_12_05_INDEX_MARKER).toBe(true);
  });

  it('exposes common core helpers', () => {
    expect(isNonNullObject({})).toBe(true);
    expect(CLOUD_COMMON_CORE_MARKER).toBe(true);
  });

  it('exposes verify admin helpers', () => {
    expect(typeof createStatsVerifyAdmin).toBe('function');
    expect(typeof createMarkVerifyAdmin).toBe('function');
    expect(GENERATE_STATS_VERIFY_ADMIN_MARKER).toBe(true);
    expect(MARK_VARIANT_DIRTY_VERIFY_ADMIN_MARKER).toBe(true);
  });

  it('exposes createDb for api key credit', () => {
    expect(typeof createDb).toBe('function');
    expect(API_KEY_CREDIT_CREATE_DB_MARKER).toBe(true);
  });
});
