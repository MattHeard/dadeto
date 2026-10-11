import { jest } from '@jest/globals';
import { createSaveStatsHtml } from '../../../src/cloud/generate-stats/storage-effect-adapter.js';

it('uploads stats HTML using the authorized permission and expected metadata', async () => {
  const save = jest.fn(async () => {});
  const file = jest.fn(() => ({ save }));
  const bucket = jest.fn(() => ({ file }));
  const permission = Object.freeze({ id: 'stats-upload' });
  const saveStatsHtml = createSaveStatsHtml({ bucket });

  await saveStatsHtml(
    permission,
    'stats-bucket',
    'prefix/stats.html',
    '<html/>'
  );

  expect(bucket).toHaveBeenCalledWith('stats-bucket');
  expect(file).toHaveBeenCalledWith('prefix/stats.html');
  expect(save).toHaveBeenCalledWith('<html/>', {
    contentType: 'text/html',
    metadata: { cacheControl: 'no-cache' },
  });
});
