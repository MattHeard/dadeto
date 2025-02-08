const header = `<!DOCTYPE html><html lang="en"><head><title>Matt Heard</title><meta name="viewport" content="width=device-width"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Acme&family=Inter:wght@100..900&display=swap" rel="stylesheet"></head><body><header><h1>Matt Heard</h1><p>Software developer and philosopher in Berlin</p></header>`;
const article = `<article><p>Hello, world!</p></article>`;
const footer = `<footer>All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.</footer></body></html>`;

export function generateBlog(blog) {
    if (blog.posts.length === 0) {
        return header + footer;
    }
    
    return header + article + footer;
}
