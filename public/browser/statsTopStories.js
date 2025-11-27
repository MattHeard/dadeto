/** @param {Array<{ title: string, variantCount: number }>} data */
export function renderTopStories(data) {
  const root = document.getElementById('topStories');
  if (
    !root ||
    !Array.isArray(data) ||
    !data.length ||
    typeof d3 === 'undefined' ||
    !d3.sankey
  ) {
    return;
  }

  const nodes = [{ name: 'Stories' }].concat(
    data.map(d => ({ name: d.title }))
  );
  const links = data.map((d, i) => ({
    source: 0,
    target: i + 1,
    value: d.variantCount,
  }));

  const W = 720;
  const H = 240;

  const sankey = d3
    .sankey()
    .nodeWidth(15)
    .nodePadding(10)
    .extent([
      [1, 1],
      [H - 1, W - 1],
    ]);

  const graph = sankey({
    nodes: nodes.map(d => ({ ...d })),
    links: links.map(d => ({ ...d })),
  });

  const svg = d3
    .create('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', W)
    .attr('height', H);

  const g = svg.append('g').attr('transform', 'rotate(90) scale(-1,1)');

  g.append('g')
    .attr('fill', 'none')
    .selectAll('path')
    .data(graph.links)
    .join('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', 'var(--muted)')
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('stroke-linecap', 'round')
    .attr('stroke-opacity', 0.6);

  const node = g.append('g').selectAll('g').data(graph.nodes).join('g');

  node
    .append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('rx', 2)
    .attr('fill', 'var(--link)');

  node
    .filter(d => d.index !== 0)
    .append('text')
    .attr('x', d => d.x1 + 6)
    .attr('y', d => (d.y0 + d.y1) / 2)
    .attr('dy', '0.35em')
    .attr('font-size', 12)
    .attr('text-anchor', 'start')
    .text(d => d.name);

  root.appendChild(svg.node());
}
