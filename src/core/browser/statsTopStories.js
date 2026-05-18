/**
 * Build the Sankey graph data for the stats top-stories chart.
 * @param {Array<{ title: string, variantCount: number }>} data Top-story rows.
 * @returns {{
 *   nodes: Array<{ name: string }>,
 *   links: Array<{ source: number, target: number, value: number }>,
 *   width: number,
 *   height: number,
 * }} Sankey-ready chart data.
 */
export function buildTopStoriesGraph(data) {
  const nodes = [{ name: 'Stories' }].concat(
    data.map(d => ({ name: d.title }))
  );
  const links = data.map((d, i) => ({
    source: 0,
    target: i + 1,
    value: d.variantCount,
  }));

  return {
    nodes,
    links,
    width: 720,
    height: 240,
  };
}
