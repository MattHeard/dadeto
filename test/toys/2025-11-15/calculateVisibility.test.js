import { describe, expect, it } from '@jest/globals';
import { calculateVisibility } from '../../../src/core/browser/toys/2025-11-15/calculateVisibility.js';

const scenarios = [
  {
    name: 'Test 1: Admin Approved',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-P': true },
        alice: { 'page-P': true },
        bob: { 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 2: Admin Rejected',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-P': false },
        alice: { 'page-P': true },
        bob: { 'page-P': true },
        carol: { 'page-P': true },
      },
    },
    expected: '0',
  },
  {
    name: 'Test 3: No Ratings',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true },
        alice: { 'page-B': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 4: Single Rating Approved',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        alice: {
          'page-A': true,
          'page-B': false,
          'page-P': true,
        },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 5: Single Rating Rejected',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        kate: { 'page-P': false },
      },
    },
    expected: '0',
  },
  {
    name: 'Test 6: Two Moderators, Direct Overlap with Admin',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false, 'page-C': true },
        alice: {
          'page-A': true,
          'page-B': false,
          'page-C': true,
          'page-P': true,
        },
        bob: {
          'page-A': false,
          'page-B': true,
          'page-C': false,
          'page-P': false,
        },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 7: Moderator Reaches Admin via Intermediary',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        alice: {
          'page-A': true,
          'page-B': false,
          'page-C': true,
          'page-D': false,
        },
        dave: { 'page-C': true, 'page-D': false, 'page-P': true },
        eve: { 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 8: Indirect Path Accumulates Distance',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        eve: {
          'page-A': true,
          'page-B': true,
          'page-C': true,
          'page-D': false,
        },
        frank: { 'page-C': false, 'page-D': false, 'page-P': false },
        grace: { 'page-P': true },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 9: Multiple Paths, Shortest Wins',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        grace: { 'page-A': true, 'page-B': false, 'page-C': true },
        henry: {
          'page-A': false,
          'page-B': true,
          'page-C': true,
          'page-D': true,
        },
        ivy: { 'page-C': true, 'page-D': true, 'page-P': false },
        jack: { 'page-E': true, 'page-P': true },
      },
    },
    expected: '0',
  },
  {
    name: 'Test 10: Partial Agreement Creates Fractional Influence',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: {
          'page-A': true,
          'page-B': false,
          'page-C': true,
          'page-D': false,
        },
        carol: {
          'page-A': true,
          'page-B': false,
          'page-C': false,
          'page-D': true,
          'page-P': true,
        },
        dan: { 'page-E': true, 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 11: Chain Breaks at Disagreeing Moderator',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true },
        larry: { 'page-A': false, 'page-B': true },
        mary: { 'page-B': true, 'page-C': true },
        nancy: { 'page-C': true, 'page-P': true },
        oscar: { 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 12: Equal Influences, Split Vote',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        alice: {
          'page-A': true,
          'page-B': false,
          'page-P': true,
        },
        bob: {
          'page-A': true,
          'page-B': false,
          'page-P': false,
        },
      },
    },
    expected: '0.5',
  },
  {
    name: 'Test 13: Three-Hop Path Beats Two-Hop',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        oscar: { 'page-A': false, 'page-B': false, 'page-C': true },
        quinn: {
          'page-A': true,
          'page-B': false,
          'page-D': true,
          'page-E': true,
        },
        rachel: { 'page-E': true, 'page-P': true },
        sam: { 'page-C': true, 'page-P': false },
      },
    },
    expected: '0.6666666666666666',
  },
  {
    name: 'Test 14: Disconnected Moderator',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        alice: { 'page-A': true, 'page-B': false },
        jack: { 'page-X': true, 'page-Y': false, 'page-P': true },
        jill: { 'page-X': true, 'page-Y': false, 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 15: Admin Has No Ratings',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: {},
        alice: { 'page-P': true },
        bob: { 'page-P': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 16: Only Admin Has Ratings, Not on Target Page',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 17: Complex Graph with Multiple Viable Paths',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false, 'page-C': true },
        alice: { 'page-A': true, 'page-B': false, 'page-D': true },
        bob: { 'page-B': false, 'page-C': true, 'page-E': true },
        carol: { 'page-D': true, 'page-E': true, 'page-F': true },
        dave: { 'page-F': true, 'page-P': true },
      },
    },
    expected: '1',
  },
  {
    name: 'Test 18: Weighted Average with Three Moderators',
    input: {
      pageId: 'page-P',
      adminId: 'matt',
      ratings: {
        matt: { 'page-A': true, 'page-B': false },
        alice: {
          'page-A': true,
          'page-B': false,
          'page-P': true,
        },
        bob: { 'page-A': true, 'page-B': true, 'page-P': false },
        carol: { 'page-A': false, 'page-B': false, 'page-P': true },
      },
    },
    expected: '0.75',
  },
];

describe('calculateVisibility', () => {
  it.each(scenarios)('%s', ({ input, expected }) => {
    const result = calculateVisibility(JSON.stringify(input));
    expect(result).toBe(expected);
  });

  it('defaults to visible on malformed input', () => {
    expect(calculateVisibility('not-json')).toBe('1');
    expect(calculateVisibility(42)).toBe('1');
  });
});
