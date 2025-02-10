import { generateBlog } from '../src/generator.js';

const header = "<body>";
const footer = "</body>";
const wrapHtml = (c) => ["<html>", c, "</html>"].join("");

describe('Blog Generator', () => {
    test('should generate complete HTML page with multiple posts', () => {
        const blog = {
            posts: [
                {
                    key: "FIRS1",
                    title: "First Post",
                    publicationDate: "2022-05-04",
                    content: "First post content"
                },
                {
                    key: "SECO2",
                    title: "Second Post",
                    publicationDate: "2022-05-06",
                    content: "Second post content"
                }
            ]
        };
        
        const expectedHtml = `<html><body>
    <article class="entry" id="FIRS1">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">FIRS1</div>
      <div class="value"><h2><a href="#FIRS1">First Post</a></h2></div>
      <div class="key">pubAt</div>
      <p class="value metadata">2022-05-04</p>
      <div class="key">text</div>
      <p class="value">First post content</p>
    </article>
    <article class="entry" id="SECO2">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">SECO2</div>
      <div class="value"><h2><a href="#SECO2">Second Post</a></h2></div>
      <div class="key">pubAt</div>
      <p class="value metadata">2022-05-06</p>
      <div class="key">text</div>
      <p class="value">Second post content</p>
    </article>
</body></html>`;

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });
});
