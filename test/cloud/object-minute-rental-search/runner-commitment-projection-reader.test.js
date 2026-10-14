import { describe, expect, test, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createFirestoreRunnerCommitmentProjectionReader } from '../../../src/cloud/object-minute-rental-search/runner-commitment-projection-reader.js';

const allowEffects = createAllowEffects();

describe('runner commitment projection reader', () => {
  test.each([1, 100])(
    'reads %i commitments with one indexed storage query',
    async count => {
      const records = Array.from({ length: count }, (_, index) => ({
        personId: 'RUNNER-1',
        startTimestamp: `2030-01-01T${String(10 + (index % 10)).padStart(2, '0')}:00:00Z`,
        endTimestamp: `2030-01-01T${String(10 + (index % 10)).padStart(2, '0')}:30:00Z`,
      }));
      const get = jest.fn(async () => ({
        docs: records.map(record => ({ data: () => record })),
      }));
      const where = jest.fn(() => ({ get }));
      const collection = jest.fn(() => ({ where }));
      const db = { collection, getAll: jest.fn() };

      const results = await createFirestoreRunnerCommitmentProjectionReader({
        db,
      }).listForRunner(allowEffects, { runnerId: 'RUNNER-1' });

      expect(results).toHaveLength(count);
      expect(collection).toHaveBeenCalledTimes(1);
      expect(collection).toHaveBeenCalledWith('runner_commitment_projections');
      expect(where).toHaveBeenCalledTimes(1);
      expect(where).toHaveBeenCalledWith('personId', '==', 'RUNNER-1');
      expect(get).toHaveBeenCalledTimes(1);
      expect(db.getAll).not.toHaveBeenCalled();
    }
  );
});
