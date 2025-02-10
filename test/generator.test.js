import { generateBlog } from '../src/generator.js';

const header = "<body>";
const footer = "</body>";
const wrapHtml = (c) => ["<html>", c, "</html>"].join("");

describe('Blog Generator', () => {
    test('should generate complete HTML page with no posts', () => {
        const blog = {
            posts: []
        };
        
        const expectedHtml = "<html><body></body></html>";
        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with a single post', () => {
        const blog = {
            posts: [{
                content: "Hello, world!"
            }]
        };
        const expectedHtml = "<html><body><article><p>Hello, world!</p></article></body></html>";
        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with multiple posts', () => {
        const blog = {
            posts: [
                { content: "First post content" },
                { content: "Second post content" }
            ]
        };
        
        const expectedHtml = "<html><body><article><p>First post content</p></article><article><p>Second post content</p></article></body></html>";

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });

    test('should render a title', () => {
        const blog = {
            posts: [
                {
                    title: "First post",
                    content: "First post content"
                }
            ]
        };

        const expectedHtml = "<html><body><article><h2>First post</h2><p>First post content</p></article></body></html>";

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });
});
