import { buildTopStoriesGraph } from '../../../src/core/browser/statsTopStories.js';

describe('buildTopStoriesGraph', () => {
  test('builds sankey-ready data for the stats chart', () => {
    expect(
      buildTopStoriesGraph([
        { title: 'Alpha', variantCount: 4 },
        { title: 'Beta', variantCount: 2 },
      ])
    ).toEqual({
      nodes: [{ name: 'Stories' }, { name: 'Alpha' }, { name: 'Beta' }],
      links: [
        { source: 0, target: 1, value: 4 },
        { source: 0, target: 2, value: 2 },
      ],
      width: 720,
      height: 240,
    });
  });
});
