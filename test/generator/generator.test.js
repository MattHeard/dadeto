import { generateBlog } from '../../src/generator/generator.js';

const header = '<body>';
const footer = '</body>';
const wrapHtml = c => ['<html>', c, '</html>'].join('');

describe('Blog Generator', () => {
  test('should generate complete HTML page with multiple posts', () => {
    const blog = {
      posts: [
        {
          key: 'FIRS1',
          title: 'First Post',
          publicationDate: '2022-05-04',
          content: ['First post content'],
          illustration: {
            fileType: 'png',
            altText: 'a messy desk, digital art, black and white',
          },
          audio: {
            fileType: 'mp3'
          },
          relatedLinks: [
            {
              url: 'https://en.wikipedia.org/wiki/Blog',
              title: 'Blog',
              author: 'Wikipedia',
              source: 'Wikipedia (EN)',
              type: 'article'
            },
            {
              url: 'https://twitter.com/example/status/123456789',
              title: 'Thoughts on blogging',
              author: '@exampleuser',
              type: 'microblog'
            },
            {
              url: 'https://example.com/books/blogging-101',
              title: 'Blogging 101',
              author: 'Jane Doe',
              source: 'Example Publishing',
              type: 'book',
              quote: 'Blogging is an essential skill for the digital age'
            }
          ],
        },
        {
          key: 'SECO2',
          title: 'Second Post',
          publicationDate: '2022-05-05',
          content: ['Second post content', 'Another paragraph'],
          illustration: {
            fileType: 'png',
            fileName: 'foo',
            altText: 'a tangle of yellow and black woollen yarn',
          },
          youtube: {
            id: 'EdlrqPPI_YQ',
            title: 'Lonely & Horny Episode 2 - Orion',
            timestamp: 420,
          },
          audio: {
            fileType: 'm4a',
          },
          relatedLinks: [
            {
              url: 'https://example.com/video-tutorial',
              title: 'Video Tutorial',
              author: 'John Smith',
              source: 'Example Videos',
              type: 'video'
            },
            {
              url: 'https://example.org/report-2022',
              title: 'Annual Report 2022',
              author: 'Research Team',
              source: 'Example Organization',
              type: 'report',
              quote: 'Significant progress was made in all key areas'
            },
            {
              url: 'https://example.net',
              title: 'Example Website',
              source: 'Example Net',
              type: 'website'
            }
          ],
          toy: {
            modulePath: '/toys/2025-03-19/identity.js',
            functionName: 'identity',
          }
        },
      ],
    };

    // The expected HTML is now a single line without indentation or newlines
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">First Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">4 May 2022</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="2022-05-04.png" alt="a messy desk, digital art, black and white"/></div><div class="key media">audio</div><audio class="value" controls><source src="2022-05-04.mp3"></audio><div class="key">text</div><p class="value">First post content</p><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://en.wikipedia.org/wiki/Blog" target="_blank" rel="noopener">"Blog"</a> by Wikipedia, Wikipedia (EN)</li><li><a href="https://twitter.com/example/status/123456789" target="_blank" rel="noopener">"Thoughts on blogging"</a> by @exampleuser</li><li><a href="https://example.com/books/blogging-101" target="_blank" rel="noopener"><em>_Blogging 101_</em></a> by Jane Doe, Example Publishing ("Blogging is an essential skill for the digital age")</li></ul></div></article><article class="entry" id="SECO2"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">SECO2</div><div class="value"><h2><a href="#SECO2">Second Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">5 May 2022</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="foo.png" alt="a tangle of yellow and black woollen yarn"/></div><div class="key media">audio</div><audio class="value" controls><source src="2022-05-05.m4a"></audio><div class="key media">video</div><p class="value"><iframe height="300px" width="100%" src="https://www.youtube.com/embed/EdlrqPPI_YQ?start=420" title="Lonely &amp; Horny Episode 2 - Orion" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></p><div class="key">text</div><p class="value">Second post content</p><div class="key"></div><p class="value">Another paragraph</p><div class="key">in</div><div class="value"><form><input type="text" disabled></form></div><div class="key"></div><div class="value"><button type="submit" disabled>Submit</button></div><div class="key">out</div><div class="value warning"><p class="output">This toy requires Javascript to run.</p></div><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://example.com/video-tutorial" target="_blank" rel="noopener">Video Tutorial</a> by John Smith, Example Videos</li><li><a href="https://example.org/report-2022" target="_blank" rel="noopener">"Annual Report 2022"</a> by Research Team, Example Organization ("Significant progress was made in all key areas")</li><li><a href="https://example.net" target="_blank" rel="noopener">Example Website</a>, Example Net</li></ul></div><script type="module">window.addComponent('SECO2', '/toys/2025-03-19/identity.js', 'identity');</script></article></body></html>`;

    const html = generateBlog(blog, header, footer, wrapHtml);
    expect(html).toBe(expectedHtml);
  });

  test('should contain content for posts', () => {
    const blog = {
      posts: [{
        key: 'POST1',
        title: 'Single Post',
        publicationDate: '2024-01-01',
        content: ['This is the content of the single post.'],
      }],
    };

    const html = generateBlog(blog, header, footer, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="POST1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">POST1</div><div class="value"><h2><a href="#POST1">Single Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Jan 2024</p><div class="key">text</div><p class="value">This is the content of the single post.</p></article></body></html>`;
    expect(html.replace(/\s+/g, '')).toBe(expectedHtml.replace(/\s+/g, ''));
  });
});
