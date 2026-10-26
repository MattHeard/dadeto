import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { generateBlogOuter } from '../../src/build/generator.js';

const blog = JSON.parse(
  readFileSync(new URL('../../src/build/blog.json', import.meta.url), 'utf8')
);
const keys = ['AGRR1', 'HTHP1'];
const posts = blog.posts.filter(post => keys.includes(post.key));
const document = new JSDOM(generateBlogOuter({ posts })).window.document;

test.each([
  ['/agricultural-rover/', 'Open the rover feasibility tool'],
  ['/industrial-heat-pump-readiness/', 'Open the heat-pump screening tool'],
])(
  'the catalogue renders a clickable decision-tool entry for %s',
  (route, label) => {
    const links = [...document.querySelectorAll(`a[href="${route}"]`)];
    expect(links.some(link => link.textContent === label)).toBe(true);
    expect(
      readFileSync(
        new URL(`../../src/content/pages${route}index.html`, import.meta.url),
        'utf8'
      )
    ).toContain('<title>');
  }
);

test('both decision-tool entries cross-link the related tool', () => {
  expect(posts).toHaveLength(2);
  expect(
    [...document.querySelectorAll('a')].map(link => link.textContent)
  ).toEqual(
    expect.arrayContaining([
      'Explore heat-pump retrofit screening',
      'Explore agricultural rover feasibility',
    ])
  );
});
