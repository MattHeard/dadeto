import { createEffectStorage } from '../../src/browser/effect-adapters.js';

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

test('createEffectStorage preserves reads and requires permission for mutations', () => {
  const storage = new StorageDouble();
  const adapted = createEffectStorage(storage);
  const permission = Object.freeze({});

  expect(adapted.getItem('missing')).toBeNull();
  adapted.setItem(permission, 'id', 'token');
  expect(adapted.getItem('id')).toBe('token');
  adapted.removeItem(permission, 'id');
  expect(adapted.getItem('id')).toBeNull();
  expect(adapted.clear).toBeUndefined();
});
