import { jest } from '@jest/globals';
import * as parsing from '../../../../src/core/cloud/payment-webhook/parsing.js';

const {
  extractPaymentEvent,
  readMetadata,
  parsePositiveInteger,
  extractHeader,
  getEventStatus,
  createDuplicateEventChecker,
  buildCreditEvent,
} = parsing;

test('exports the live domain helpers without obsolete platform fallbacks', () => {
  expect(Object.keys(parsing).sort()).toEqual(
    [
      'buildCreditEvent',
      'createDuplicateEventChecker',
      'extractHeader',
      'extractPaymentEvent',
      'getEventStatus',
      'parsePositiveInteger',
      'readMetadata',
      'requireWebhookDependency',
    ].sort()
  );
});

describe('payment event input', () => {
  test.each([undefined, null, false, 0, 'text', Symbol('request')])(
    'rejects non-object requests: %s',
    async request => {
      await expect(extractPaymentEvent(request)).rejects.toThrow(
        new TypeError('request must be an object')
      );
    }
  );
  test.each([undefined, null, {}, [], 'text', { id: 1 }, { id: null }])(
    'rejects unsupported event bodies: %s',
    async body => {
      await expect(extractPaymentEvent({ body })).rejects.toThrow(
        new TypeError('request body must be a payment event object')
      );
    }
  );
  test.each([{ id: 'evt-1', type: 'paid' }, { id: '' }])(
    'retains the accepted event object: %s',
    async body => {
      await expect(extractPaymentEvent({ body })).resolves.toBe(body);
    }
  );
});

test('metadata keeps only nonempty strings without trimming them', () => {
  expect(
    readMetadata({
      metadata: {
        kept: 'value',
        space: ' ',
        empty: '',
        number: 1,
        null: null,
        object: {},
      },
    })
  ).toEqual({ kept: 'value', space: ' ' });
  expect(readMetadata({ metadata: ['value', '', 2] })).toEqual({ 0: 'value' });
});

test.each([undefined, null, false, 0, 'text'])(
  'absent/non-object metadata gives an empty map: %s',
  metadata => {
    expect(readMetadata({ metadata })).toEqual({});
  }
);

test.each([
  ['12', 12],
  ['1', 1],
  [' +3 ', 3],
  ['1.5', 1],
  ['42suffix', 42],
  ['1e3', 1],
  ['0x10', 0],
  ['0', 0],
  ['-0', 0],
  ['-1', 0],
  ['', 0],
  ['invalid', 0],
  ['9'.repeat(400), 0],
  [undefined, 0],
  [null, 0],
  [12, 0],
  [[], 0],
])('preserves amount parsing for %s', (input, expected) => {
  expect(parsePositiveInteger(input)).toBe(expected);
});

describe('header input', () => {
  test('uses canonical/lowercase precedence and nullish fallback', () => {
    expect(
      extractHeader(
        { headers: { 'X-Key': 'canonical', 'x-key': 'lower' } },
        'X-Key'
      )
    ).toBe('canonical');
    expect(extractHeader({ headers: { 'x-key': 'lower' } }, 'X-Key')).toBe(
      'lower'
    );
    expect(
      extractHeader({ headers: { 'X-Key': null, 'x-key': 'lower' } }, 'X-Key')
    ).toBe('lower');
    expect(
      extractHeader({ headers: { 'X-Key': '', 'x-key': 'lower' } }, 'X-Key')
    ).toBe('');
    expect(
      extractHeader({ headers: { 'X-Key': 0, 'x-key': 'lower' } }, 'X-Key')
    ).toBe('');
    expect(extractHeader({ headers: { 'x-key': ['value'] } }, 'X-Key')).toBe(
      ''
    );
  });
  test.each([undefined, null, {}, { headers: null }, { headers: {} }])(
    'missing headers give an empty string: %s',
    request => {
      expect(extractHeader(request, 'X-Key')).toBe('');
    }
  );
});

test.each([
  [{ status: 200, body: { deferred: true } }, 'deferred'],
  [{ status: 500, body: { deferred: true, quarantined: true } }, 'deferred'],
  [{ status: 200, body: { quarantined: true, ignored: true } }, 'quarantined'],
  [{ status: 200, body: { ignored: true } }, 'ignored'],
  [{ status: 500, body: { duplicate: true } }, 'ignored'],
  [{ status: 399, body: {} }, 'applied'],
  [{ status: 400, body: {} }, 'quarantined'],
  [{ status: 500, body: null }, 'quarantined'],
  [{ status: 200, body: undefined }, 'applied'],
  [{ status: 200, body: 'text' }, 'applied'],
  [
    {
      status: 200,
      body: {
        deferred: false,
        quarantined: false,
        ignored: false,
        duplicate: false,
      },
    },
    'applied',
  ],
  [
    {
      status: 200,
      body: { deferred: 'yes', quarantined: 1, ignored: 'yes', duplicate: 1 },
    },
    'applied',
  ],
  [
    { status: 200, body: Object.assign(() => {}, { deferred: true }) },
    'applied',
  ],
])('maps inbox status for %s', (response, expected) => {
  expect(getEventStatus(response)).toBe(expected);
});

test.each([false, true])(
  'duplicate checks normalize sync/async %s results',
  async value => {
    for (const checker of [jest.fn(() => value), jest.fn(async () => value)]) {
      const result = createDuplicateEventChecker(checker)('event-1');
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(value);
      expect(checker).toHaveBeenCalledTimes(1);
      expect(checker).toHaveBeenCalledWith('event-1');
    }
  }
);

test('duplicate checker failures propagate', async () => {
  const failure = new Error('checker failed');
  await expect(
    createDuplicateEventChecker(() => {
      throw failure;
    })('event-1')
  ).rejects.toBe(failure);
});

test.each([
  ['charge.refunded', 'credit_deducted'],
  ['charge.dispute.created', 'credit_deducted'],
  ['payment_intent.succeeded', 'credit_added'],
  ['refund.created', 'credit_added'],
])('maps the generic credit event for %s', (type, expected) => {
  expect(buildCreditEvent({ id: 'event-1', type }, 7)).toEqual({
    type: expected,
    eventId: 'event-1',
    amount: 7,
  });
});
