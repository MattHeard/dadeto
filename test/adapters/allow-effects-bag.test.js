import { jest } from '@jest/globals';
import { adaptAllowEffectsBag } from '../../src/adapters/allow-effects.js';

const permission = Object.freeze({});

class StorageDouble {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

test('exposes only selected methods and makes effects permission-first', () => {
  const raw = new StorageDouble();
  const adapted = adaptAllowEffectsBag(raw, {
    getItem: 'query',
    setItem: 'effect',
    removeItem: 'effect',
  });

  expect(adapted.getItem('missing')).toBeNull();
  adapted.setItem(permission, 'id', 'token');
  expect(adapted.getItem('id')).toBe('token');
  adapted.removeItem(permission, 'id');
  expect(adapted.getItem('id')).toBeNull();
  expect(adapted.clear).toBeUndefined();
  expect(adapted.toString).toBeUndefined();
  expect(Object.getPrototypeOf(adapted)).toBeNull();
  expect(Object.isFrozen(adapted)).toBe(true);
});

test('binds query and effect methods to the original object', () => {
  const raw = new StorageDouble();
  const adapted = adaptAllowEffectsBag(raw, {
    getItem: 'query',
    setItem: 'effect',
  });

  adapted.setItem(permission, 'id', 'bound');

  expect(adapted.getItem('id')).toBe('bound');
});

test('supports explicitly selected nested method paths', () => {
  const raw = {
    customers: {
      prefix: 'customer:',
      create(id) {
        return `${this.prefix}${id}`;
      },
      list() {
        return [this.prefix];
      },
    },
    unused: {
      remove() {
        return 'not exposed';
      },
    },
  };
  const adapted = adaptAllowEffectsBag(raw, {
    customers: { create: 'effect', list: 'query' },
  });

  expect(adapted.customers.create(permission, 'a')).toBe('customer:a');
  expect(adapted.customers.list()).toEqual(['customer:']);
  expect(adapted.customers.remove).toBeUndefined();
  expect(adapted.unused).toBeUndefined();
});

test('rejects missing, empty, unknown, and invalid classifications', () => {
  const raw = { method() {}, value: 1 };

  expect(() => adaptAllowEffectsBag(null, { method: 'effect' })).toThrow(
    'Invalid adapter target at <root>'
  );
  expect(() => adaptAllowEffectsBag(raw, undefined)).toThrow(
    'Invalid method classification at <root>'
  );
  expect(() => adaptAllowEffectsBag(raw, null)).toThrow(
    'Invalid method classification at <root>'
  );
  expect(() => adaptAllowEffectsBag(raw, [])).toThrow(
    'Invalid method classification at <root>'
  );
  expect(() => adaptAllowEffectsBag(raw, {})).toThrow(
    'Empty method classification at <root>'
  );
  expect(() => adaptAllowEffectsBag(raw, { absent: 'effect' })).toThrow(
    'Unknown classified property: absent'
  );
  expect(() => adaptAllowEffectsBag(raw, { value: 'query' })).toThrow(
    'Classified method is not callable: value'
  );
  expect(() => adaptAllowEffectsBag(raw, { method: 'command' })).toThrow(
    'Invalid method classification at method'
  );
  const symbolClassification = Object.create(null);
  symbolClassification[Symbol('method')] = 'effect';
  expect(() => adaptAllowEffectsBag(raw, symbolClassification)).toThrow(
    'Invalid classified property at <root>'
  );
});

test('rejects nested classifications without a raw object', () => {
  expect(() =>
    adaptAllowEffectsBag({ nested: null }, { nested: { save: 'effect' } })
  ).toThrow('Classified nested path is not an object: nested');
});

test('rejects selected accessors without invoking their getter', () => {
  const getter = jest.fn(() => () => 'value');
  const raw = Object.defineProperty({}, 'read', { get: getter });

  expect(() => adaptAllowEffectsBag(raw, { read: 'query' })).toThrow(
    'Accessor classification is unsupported: read'
  );
  expect(getter).not.toHaveBeenCalled();
});
