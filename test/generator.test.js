import { generateBlog } from '../src/generator.js';

const header = "<body>";
const footer = "</body>";
const wrapHtml = (c) => ["<html>", c, "</html>"].join("");

describe('Blog Generator', () => {
    test('should generate complete HTML page with no posts', () => {
        const blog = {
            posts: []
        };
        
        const expectedHtml = `<html><body>
</body></html>`;
        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with a single post', () => {
        const blog = {
            posts: [{
                key: "SING1",
                content: "Hello, world!"
            }]
        };
        const expectedHtml = `<html><body>
    <article class="entry" id="SING1">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">SING1</div>
      <p>Hello, world!</p>
    </article>
</body></html>`;
        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with multiple posts', () => {
        const blog = {
            posts: [
                { key: "FIRS1", content: "First post content" },
                { key: "SECO2", content: "Second post content" }
            ]
        };
        
        const expectedHtml = `<html><body>
    <article class="entry" id="FIRS1">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">FIRS1</div>
      <p>First post content</p>
    </article>
    <article class="entry" id="SECO2">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">SECO2</div>
      <p>Second post content</p>
    </article>
</body></html>`;

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should render a title', () => {
        const blog = {
            posts: [
                {
                    key: "TITL1",
                    title: "First post",
                    content: "First post content"
                }
            ]
        };

        const expectedHtml = `<html><body>
    <article class="entry" id="TITL1">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">TITL1</div>
      <h2>First post</h2><p>First post content</p>
    </article>
</body></html>`;

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });
});
