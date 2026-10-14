import { readFileSync } from 'node:fs';
import { createAllowEffects } from '../../src/cloud/allow-effects.js';
import { createGcsRunnerScheduleProvider } from '../../src/cloud/object-minute-rental-search/runner-schedule-provider.js';

const allowEffects = createAllowEffects();

describe('object-minute rental runner schedule configuration', () => {
  test('starts without claiming runner availability', async () => {
    const schedule = JSON.parse(
      readFileSync('infra/object-minute-rental-schedule.json', 'utf8')
    );
    const provider = createGcsRunnerScheduleProvider({
      storage: {
        bucket: () => ({
          file: () => ({
            download: async () => [Buffer.from(JSON.stringify(schedule))],
          }),
        }),
      },
      bucketName: 'schedule-bucket',
      objectName: 'runner-schedule.json',
    });

    expect(schedule).toEqual([]);
    await expect(
      provider.getSchedule(allowEffects, { runnerId: 'RUNNER-1' })
    ).resolves.toEqual([]);
  });

  test('keeps operator schedule edits across subsequent Terraform applies', () => {
    const source = readFileSync(
      'infra/functions-object-minute-rental-search.tf',
      'utf8'
    );

    expect(source).toMatch(/ignore_changes\s*=\s*\[source,\s*content\]/);
  });

  test('seeds only an ephemeral availability window for deployed E2E', () => {
    const workflow = readFileSync('.github/workflows/gcp-test.yml', 'utf8');

    expect(workflow).toContain(
      'Seed temporary runner availability for search E2E'
    );
    expect(workflow).toContain("date -u -d '1 day ago'");
    expect(workflow).toContain("date -u -d '3 days'");
    expect(workflow).toContain('gs://${SCHEDULE_BUCKET}/runner-schedule.json');
  });
});
