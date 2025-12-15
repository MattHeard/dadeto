import { generateBlog } from '../../src/build/generator.js';

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
            fileType: 'mp3',
          },
          relatedLinks: [
            {
              url: 'https://en.wikipedia.org/wiki/Blog',
              title: 'Blog',
              author: 'Wikipedia',
              source: 'Wikipedia (EN)',
              type: 'article',
            },
            {
              url: 'https://twitter.com/example/status/123456789',
              title: 'Thoughts on blogging',
              author: '@exampleuser',
              type: 'microblog',
            },
            {
              url: 'https://example.com/books/blogging-101',
              title: 'Blogging 101',
              author: 'Jane Doe',
              source: 'Example Publishing',
              type: 'book',
              quote: 'Blogging is an essential skill for the digital age',
            },
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
              type: 'video',
            },
            {
              url: 'https://example.org/report-2022',
              title: 'Annual Report 2022',
              author: 'Research Team',
              source: 'Example Organization',
              type: 'report',
              quote: 'Significant progress was made in all key areas',
            },
            {
              url: 'https://example.net',
              title: 'Example Website',
              source: 'Example Net',
              type: 'website',
            },
          ],
          toy: {
            modulePath: '/toys/2025-03-19/identity.js',
            functionName: 'identity',
          },
        },
      ],
    };

    // The expected HTML is now a single line without indentation or newlines
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">First Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">4 May 2022</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="2022-05-04.png" alt="a messy desk, digital art, black and white"/></div><div class="key media">audio</div><audio class="value" controls><source src="2022-05-04.mp3"></audio><div class="key">text</div><p class="value">First post content</p><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://en.wikipedia.org/wiki/Blog" target="_blank" rel="noopener">"Blog"</a> by Wikipedia, Wikipedia (EN)</li><li><a href="https://twitter.com/example/status/123456789" target="_blank" rel="noopener">"Thoughts on blogging"</a> by @exampleuser</li><li><a href="https://example.com/books/blogging-101" target="_blank" rel="noopener"><em>_Blogging 101_</em></a> by Jane Doe, Example Publishing ("Blogging is an essential skill for the digital age")</li></ul></div></article><article class="entry" id="SECO2"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">SECO2</div><div class="value"><h2><a href="#SECO2">Second Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">5 May 2022</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="foo.png" alt="a tangle of yellow and black woollen yarn"/></div><div class="key media">audio</div><audio class="value" controls><source src="2022-05-05.m4a"></audio><div class="key media">video</div><p class="value"><iframe height="300px" width="100%" src="https://www.youtube.com/embed/EdlrqPPI_YQ?start=420" title="Lonely &amp; Horny Episode 2 - Orion" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></p><div class="key">text</div><p class="value">Second post content</p><div class="key"></div><p class="value">Another paragraph</p><div class="key">in</div><div class="value"><select class="input"><option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option><option value="kv">kv</option><option value="dendrite-story">dendrite-story</option><option value="dendrite-page">dendrite-page</option><option value="moderator-ratings">moderator-ratings</option></select><input type="text" disabled></div><div class="key"></div><div class="value"><button type="submit" disabled>Submit</button></div><div class="key">out</div><div class="value"><select class="output"><option value="text">text</option><option value="pre">pre</option><option value="tic-tac-toe">tic-tac-toe</option><option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option><option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option></select><div class="output warning"><p>This toy requires Javascript to run.</p></div></div><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://example.com/video-tutorial" target="_blank" rel="noopener">Video Tutorial</a> by John Smith, Example Videos</li><li><a href="https://example.org/report-2022" target="_blank" rel="noopener">"Annual Report 2022"</a> by Research Team, Example Organization ("Significant progress was made in all key areas")</li><li><a href="https://example.net" target="_blank" rel="noopener">Example Website</a>, Example Net</li></ul></div><script type="module">window.addComponent('SECO2', '/toys/2025-03-19/identity.js', 'identity');</script></article></body></html>`;

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toBe(expectedHtml);
  });

  test('should contain content for posts', () => {
    const blog = {
      posts: [
        {
          key: 'FIRS1',
          title: 'First',
          publicationDate: '2024-01-01',
          content: ['This is the content of the first post.'],
        },
        {
          key: 'SECO1',
          title: 'Second',
          publicationDate: '2023-12-31',
          content: ['This post has two paragraphs.', 'Here is the second one.'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">First</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Jan 2024</p><div class="key">text</div><p class="value">This is the content of the first post.</p></article><article class="entry" id="SECO1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">SECO1</div><div class="value"><h2><a href="#SECO1">Second</a></h2></div><div class="key">pubAt</div><p class="value metadata">31 Dec 2023</p><div class="key">text</div><p class="value">This post has two paragraphs.</p><div class="key"></div><p class="value">Here is the second one.</p></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should contain an illustration for posts', () => {
    const blog = {
      posts: [
        {
          key: 'FIRS1',
          title: 'Single Post',
          publicationDate: '2024-01-01',
          illustration: {
            fileType: 'png',
            altText: 'An illustration',
          },
        },
        {
          key: 'SECO1',
          title: 'Second',
          publicationDate: '2023-12-31',
          illustration: {
            fileType: 'svg',
            fileName: '2023-12-31-0',
            altText: 'A diagram',
          },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">Single Post</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Jan 2024</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="2024-01-01.png" alt="An illustration"/></div></article><article class="entry" id="SECO1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">SECO1</div><div class="value"><h2><a href="#SECO1">Second</a></h2></div><div class="key">pubAt</div><p class="value metadata">31 Dec 2023</p><div class="key media">illus</div><div class="value"><img loading="lazy" src="2023-12-31-0.svg" alt="A diagram"/></div></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should contain audio elements', () => {
    const blog = {
      posts: [
        {
          key: 'FIRS1',
          title: 'First',
          publicationDate: '2024-01-01',
          audio: {
            fileType: 'mp3',
          },
        },
        {
          key: 'SECO1',
          title: 'Second',
          publicationDate: '2023-12-31',
          audio: {
            fileType: 'wav',
          },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">First</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Jan 2024</p><div class="key media">audio</div><audio class="value" controls><source src="2024-01-01.mp3"></audio></article><article class="entry" id="SECO1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">SECO1</div><div class="value"><h2><a href="#SECO1">Second</a></h2></div><div class="key">pubAt</div><p class="value metadata">31 Dec 2023</p><div class="key media">audio</div><audio class="value" controls><source src="2023-12-31.wav"></audio></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should contain related links for a post', () => {
    const blog = {
      posts: [
        {
          key: 'LINK1',
          title: 'Post with Links',
          publicationDate: '2024-01-15',
          relatedLinks: [
            {
              url: 'https://example.com/article',
              title: 'Example Article',
              author: 'John Doe',
              source: 'Example Blog',
              type: 'article',
              quote: 'This is an important quote',
            },
            {
              url: 'https://example.org/book',
              title: 'Example Book',
              author: 'Jane Smith',
              source: 'Example Publishing',
              type: 'book',
            },
            {
              url: 'https://example.net',
              title: 'Example Website',
              source: 'Example Net',
            },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="LINK1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">LINK1</div><div class="value"><h2><a href="#LINK1">Post with Links</a></h2></div><div class="key">pubAt</div><p class="value metadata">15 Jan 2024</p><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://example.com/article" target="_blank" rel="noopener">"Example Article"</a> by John Doe, Example Blog ("This is an important quote")</li><li><a href="https://example.org/book" target="_blank" rel="noopener"><em>_Example Book_</em></a> by Jane Smith, Example Publishing</li><li><a href="https://example.net" target="_blank" rel="noopener">Example Website</a>, Example Net</li></ul></div></article></body></html>`;
    expect(html).toBe(expectedHtml);
    const blogNoLinks = {
      posts: [
        {
          key: 'EMPTY',
          title: 'No Links',
          publicationDate: '2024-06-01',
          content: ['none'],
          relatedLinks: [],
        },
      ],
    };
    const htmlNoLinks = generateBlog(
      { blog: blogNoLinks, header, footer },
      wrapHtml
    );
    expect(htmlNoLinks).not.toContain('related-links');
  });

  // Posts with undefined or empty relatedLinks shouldn't render the section
  test('should omit related links section when none are provided', () => {
    const blog = {
      posts: [
        {
          key: 'NOL1',
          title: 'No Links',
          publicationDate: '2024-06-01',
          content: ['No links here'],
        },
        {
          key: 'NOL2',
          title: 'Empty Links',
          publicationDate: '2024-06-02',
          content: ['Still no links'],
          relatedLinks: [],
        },
      ],
    };

    const htmlNoLinks = generateBlog({ blog, header, footer }, wrapHtml);
    expect(htmlNoLinks).toContain('<article class="entry" id="NOL1">');
    expect(htmlNoLinks).toContain('<article class="entry" id="NOL2">');
    expect(htmlNoLinks).not.toMatch('<div class="key">links</div>');
    expect(htmlNoLinks).not.toMatch('related-links');
    expect(htmlNoLinks).not.toContain('undefined');
  });

  test('should omit related links section when value is not an array', () => {
    const blog = {
      posts: [
        {
          key: 'STRL',
          title: 'String Links',
          publicationDate: '2024-06-03',
          content: ['Still no links'],
          relatedLinks: 'not-an-array',
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<article class="entry" id="STRL">');
    expect(html).not.toMatch('<div class="key">links</div>');
    expect(html).not.toMatch('related-links');
    expect(html).not.toContain('undefined');
  });

  test('should escape related link fields when optional values are missing', () => {
    const blog = {
      posts: [
        {
          key: 'MISS1',
          title: 'Missing Fields',
          publicationDate: '2024-07-01',
          content: ['hi'],
          relatedLinks: [
            {
              url: 'https://example.com',
              type: 'article',
            },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain(
      '<li><a href="https://example.com" target="_blank" rel="noopener">""</a></li>'
    );
    expect(html).not.toContain('undefined');
  });

  test('should contain a YouTube video for a post', () => {
    const blog = {
      posts: [
        {
          key: 'VIDE1',
          title: 'Post with Video',
          publicationDate: '2024-02-01',
          youtube: {
            id: 'dQw4w9WgXcQ',
            timestamp: 0,
            title: 'Never Gonna Give You Up',
          },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="VIDE1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">VIDE1</div><div class="value"><h2><a href="#VIDE1">Post with Video</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Feb 2024</p><div class="key media">video</div><p class="value"><iframe height="300px" width="100%" src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=0" title="Never Gonna Give You Up" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe></p></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should contain a toy component for a post', () => {
    const blog = {
      posts: [
        {
          key: 'TOY01',
          title: 'Post with Toy',
          publicationDate: '2024-03-01',
          toy: {
            modulePath: './toys/2024-03-01/calculator.js',
            functionName: 'calculator',
          },
        },
        {
          key: 'LINK1',
          title: 'Post with Related Links',
          publicationDate: '2024-03-02',
          relatedLinks: [
            {
              url: 'https://example.com/article',
              title: 'Example Article',
              author: 'John Doe',
              source: 'Example Blog',
              type: 'article',
            },
            {
              url: 'https://example.org/book',
              title: 'Programming Guide',
              author: 'Jane Smith',
              source: 'Tech Publishing',
              type: 'book',
            },
          ],
          toy: {
            modulePath: './toys/2024-03-02/counter.js',
            functionName: 'counter',
          },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="TOY01"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">TOY01</div><div class="value"><h2><a href="#TOY01">Post with Toy</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Mar 2024</p><div class="key">in</div><div class="value"><select class="input"><option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option><option value="kv">kv</option><option value="dendrite-story">dendrite-story</option><option value="dendrite-page">dendrite-page</option><option value="moderator-ratings">moderator-ratings</option></select><input type="text" disabled></div><div class="key"></div><div class="value"><button type="submit" disabled>Submit</button></div><div class="key">out</div><div class="value"><select class="output"><option value="text">text</option><option value="pre">pre</option><option value="tic-tac-toe">tic-tac-toe</option><option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option><option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option></select><div class="output warning"><p>This toy requires Javascript to run.</p></div></div><script type="module">window.addComponent('TOY01', './toys/2024-03-01/calculator.js', 'calculator');</script></article><article class="entry" id="LINK1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">LINK1</div><div class="value"><h2><a href="#LINK1">Post with Related Links</a></h2></div><div class="key">pubAt</div><p class="value metadata">2 Mar 2024</p><div class="key">in</div><div class="value"><select class="input"><option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option><option value="kv">kv</option><option value="dendrite-story">dendrite-story</option><option value="dendrite-page">dendrite-page</option><option value="moderator-ratings">moderator-ratings</option></select><input type="text" disabled></div><div class="key"></div><div class="value"><button type="submit" disabled>Submit</button></div><div class="key">out</div><div class="value"><select class="output"><option value="text">text</option><option value="pre">pre</option><option value="tic-tac-toe">tic-tac-toe</option><option value="battleship-solitaire-fleet">battleship-solitaire-fleet</option><option value="battleship-solitaire-clues-presenter">battleship-solitaire-clues-presenter</option></select><div class="output warning"><p>This toy requires Javascript to run.</p></div></div><div class="key">links</div><div class="value"><ul class="related-links"><li><a href="https://example.com/article" target="_blank" rel="noopener">"Example Article"</a> by John Doe, Example Blog</li><li><a href="https://example.org/book" target="_blank" rel="noopener"><em>_Programming Guide_</em></a> by Jane Smith, Tech Publishing</li></ul></div><script type="module">window.addComponent('LINK1', './toys/2024-03-02/counter.js', 'counter');</script></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should display tags for posts', () => {
    const blog = {
      posts: [
        {
          key: 'TAG01',
          title: 'Post with Single Tag',
          publicationDate: '2024-04-01',
          content: ['This is a post with a single tag.'],
          tags: ['tutorial'],
        },
        {
          key: 'TAG02',
          title: 'Post with Multiple Tags',
          publicationDate: '2024-04-02',
          content: ['This is a post with multiple tags.'],
          tags: ['javascript', 'programming', 'web-development'],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry tag-tutorial" id="TAG01"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">TAG01</div><div class="value"><h2><a href="#TAG01">Post with Single Tag</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Apr 2024</p><div class="key">tags</div><p class="value metadata"><a class="tag-tutorial">tutorial</a></p><div class="key">text</div><p class="value">This is a post with a single tag.</p></article><article class="entry tag-javascript tag-programming tag-web-development" id="TAG02"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">TAG02</div><div class="value"><h2><a href="#TAG02">Post with Multiple Tags</a></h2></div><div class="key">pubAt</div><p class="value metadata">2 Apr 2024</p><div class="key">tags</div><p class="value metadata"><a class="tag-javascript">javascript</a>, <a class="tag-programming">programming</a>, <a class="tag-web-development">web-development</a></p><div class="key">text</div><p class="value">This is a post with multiple tags.</p></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  // Posts with undefined or empty tag arrays shouldn't render tags
  test('should omit tags section when none are provided', () => {
    const blog = {
      posts: [
        {
          key: 'NO1',
          title: 'No Tags',
          publicationDate: '2024-04-03',
          content: ['No tags here'],
        },
        {
          key: 'NO2',
          title: 'Empty Tags',
          publicationDate: '2024-04-04',
          content: ['Still no tags'],
          tags: [],
        },
      ],
    };

    const htmlNoTags = generateBlog({ blog, header, footer }, wrapHtml);
    expect(htmlNoTags).toContain('<article class="entry" id="NO1">');
    expect(htmlNoTags).toContain('<article class="entry" id="NO2">');
    expect(htmlNoTags).not.toMatch('<div class="key">tags</div>');
    expect(htmlNoTags).not.toMatch('tag-');
  });

  test('should render quotes as blockquotes', () => {
    const blog = {
      posts: [
        {
          key: 'FIRS1',
          title: 'First',
          publicationDate: '2024-01-01',
          content: [
            {
              type: 'quote',
              content: 'This is the content of the first post.',
            },
            {
              type: 'quote',
              content: [
                'This is a quote with multiple lines.',
                'Here is the second one.',
              ],
            },
          ],
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    const expectedHtml = `<html><body><article class="entry" id="FIRS1"><div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div><div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div><div class="key article-title">FIRS1</div><div class="value"><h2><a href="#FIRS1">First</a></h2></div><div class="key">pubAt</div><p class="value metadata">1 Jan 2024</p><div class="key">text</div><blockquote class="value"><div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div><p>This is the content of the first post.</p></blockquote><div class="key"></div><blockquote class="value"><div class="corner corner-tl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-tr"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-bl"><div class="h-line"></div><div class="v-line"></div></div><div class="corner corner-br"><div class="h-line"></div><div class="v-line"></div></div><p>This is a quote with multiple lines.</p><p>Here is the second one.</p></blockquote></article></body></html>`;
    expect(html).toBe(expectedHtml);
  });

  test('should generate media sections when posts include media', () => {
    const blog = {
      posts: [
        {
          key: 'MEDIA1',
          title: 'Media Post',
          publicationDate: '2024-06-01',
          illustration: { fileType: 'png', altText: 'art' },
          audio: { fileType: 'mp3' },
        },
      ],
    };

    const html = generateBlog({ blog, header, footer }, wrapHtml);
    expect(html).toContain('<img');
    expect(html).toContain('<audio');
  });
});
