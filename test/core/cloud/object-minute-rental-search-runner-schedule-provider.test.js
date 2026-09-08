import { describe, expect, it, jest } from '@jest/globals';
import { createGcsRunnerScheduleProvider } from '../../../src/cloud/object-minute-rental-search/runner-schedule-provider.js';

/**
 *
 * @param contents
 */
/**
 * @param {string} contents Serialized schedule contents.
 * @returns {object} Configured schedule provider.
 */
function providerFor(contents) {
  return createGcsRunnerScheduleProvider({
    storage: {
      bucket: () => ({
        file: () => ({
          download: jest.fn(async () => [Buffer.from(contents)]),
        }),
      }),
    },
    bucketName: 'schedule-bucket',
    objectName: 'runner-schedule.json',
  });
}

describe('GCS runner schedule provider', () => {
  it('loads a valid schedule snapshot', async () => {
    await expect(
      providerFor(
        '[{"startTimestamp":"2026-09-07T08:00:00Z","endTimestamp":"2026-09-07T16:00:00Z"}]'
      ).getSchedule({ runnerId: 'RUNNER-1' })
    ).resolves.toEqual([
      {
        startTimestamp: '2026-09-07T08:00:00Z',
        endTimestamp: '2026-09-07T16:00:00Z',
      },
    ]);
  });

  it.each([
    ['missing schedule entries', '{}'],
    ['invalid timestamps', '[{"startTimestamp":"bad","endTimestamp":"bad"}]'],
    [
      'reversed intervals',
      '[{"startTimestamp":"2026-09-07T16:00:00Z","endTimestamp":"2026-09-07T08:00:00Z"}]',
    ],
  ])('fails closed for %s', async (_label, contents) => {
    await expect(providerFor(contents).getSchedule({})).rejects.toThrow(
      'Invalid runner schedule configuration.'
    );
  });

  it('requires storage configuration', async () => {
    await expect(
      createGcsRunnerScheduleProvider({
        storage: {},
        bucketName: '',
        objectName: '',
      }).getSchedule({})
    ).rejects.toThrow('Runner schedule storage configuration is required.');
  });
});
