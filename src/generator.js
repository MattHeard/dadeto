const doctype = `<!DOCTYPE html>`;
const htmlPrefix = `<html lang="en">`;
const blogTitle = `<title>Matt Heard</title>`;
const metaTags = `<meta name="viewport" content="width=device-width">`;
const fontLinks = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Acme&family=Inter:wght@100..900&display=swap" rel="stylesheet">`;
const headContent = [blogTitle, metaTags, fontLinks].join("");
const wrap = (tag, content) => `<${tag}>${content}</${tag}>`;
const headBlock = wrap("head", headContent);
const bodyPrefix = `<body>`;
const headerElement = `<header><h1>Matt Heard</h1><p>Software developer and philosopher in Berlin</p></header>`;
const header = [headBlock, bodyPrefix, headerElement].join("");
const bodySuffix = `</body>`;
const htmlSuffix = `</html>`;
const footerContent = `All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.`;
const footerBlock = wrap("footer", footerContent);
const footer = [footerBlock, bodySuffix].join("");
const wrapHtml = (content) => [doctype, htmlPrefix, content, htmlSuffix].join("");

// Create an article from a post
const wrapH2 = (content) => wrap("h2", content);
const renderTitle = (t) => t ? wrapH2(t) : "";
const wrapP = (content) => wrap("p", content);
const renderContent = (c) => wrapP(c);
const wrapArticle = (content) => wrap("article", content);
const getArticleContent = (post) => [renderTitle(post.title), renderContent(post.content)].join("");
const getArticle = (post) => wrapArticle(getArticleContent(post));

// Generate the HTML from a blog
export function generateBlog(blog, header, footer, wrapHtml) {
    const articles = blog.posts.map(getArticle);
    const htmlContents = header + articles.join("") + footer;
    return wrapHtml(htmlContents);
}

export function generateBlogOuter(blog) {
    return generateBlog(blog, header, footer, wrapHtml);
};