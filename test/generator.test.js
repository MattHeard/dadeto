import { generateBlog } from '../src/generator.js';

describe('Blog Generator', () => {
    const expectedHeader = `<!DOCTYPE html><html lang="en"><head><title>Matt Heard</title><meta name="viewport" content="width=device-width"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Acme&family=Inter:wght@100..900&display=swap" rel="stylesheet"></head><body><header><h1>Matt Heard</h1><p>Software developer and philosopher in Berlin</p></header>`;
    const expectedFooter = `<footer>All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.</footer></body></html>`;

    test('should generate complete HTML page with no posts', () => {
        const blog = {
            posts: []
        };
        
        const expectedHtml = expectedHeader + expectedFooter;
        
        const html = generateBlog(blog);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with a single post', () => {
        const blog = {
            posts: [{
                content: "Hello, world!"
            }]
        };
        const expectedBody = `<article><p>Hello, world!</p></article>`;
        const expectedHtml = expectedHeader + expectedBody + expectedFooter;
        
        const html = generateBlog(blog);
        expect(html).toBe(expectedHtml);
    });

    test('should generate complete HTML page with multiple posts', () => {
        const blog = {
            posts: [
                { content: "First post content" },
                { content: "Second post content" }
            ]
        };
        
        const expectedBody = `<article><p>First post content</p></article><article><p>Second post content</p></article>`;
        const expectedHtml = expectedHeader + expectedBody + expectedFooter;

        const html = generateBlog(blog);
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

        const expectedBody = `<article><h2>First post</h2><p>First post content</p></article>`;
        const expectedHtml = expectedHeader + expectedBody + expectedFooter;

        const html = generateBlog(blog);
        expect(html).toBe(expectedHtml);
    });
});
