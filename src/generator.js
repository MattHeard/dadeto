const header = `<!DOCTYPE html>
<html lang="en">
    <head>
        <title>Matt Heard</title>
        <meta name="viewport" content="width=device-width">
        <meta name="theme-color" content="mintcream">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Acme&family=Inter:wght@100..900&display=swap" rel="stylesheet">
        <style>
            a {
                color: inherit;
            }

            article {
                padding: 4em 1em 0em 1em;
                border: 0.2em solid navy;
                border-left: 0.6em solid;
            }

            body {
                background-color: mintcream;
                color: navy;
                font-family: 'Inter', 'Avenir', Arial, Helvetica, sans-serif;
                display: grid;
                grid-gap: 2vw;
                grid-template-columns: repeat(auto-fill, minmax(48vw, auto));
            }

            footer {
                margin-top: 1em;
                font-style: italic;
                text-align: right;
            }

            h1 {
                font-size: 3em;
            }

            h2 {
                font-size: 2em;
            }

            h1, h2, h3 {
                font-family: 'Acme', 'Inter', 'Academy Engraved LET', Arial, Helvetica, sans-serif;
            }

            header {
                text-align: right;
            }
        </style>
    </head>
    <body>
        <header>
            <h1>Matt Heard</h1>
            <p>Software developer and philosopher in Berlin</p>
        </header>`;

const article = `
        <article>
            <p>Hello, world!</p>
        </article>`;

const footer = `
        <footer>
            All content is authored by Matt Heard and is <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>, unless otherwise noted.
        </footer>
    </body>
</html>`;

export function generateBlog(blog) {
    if (blog.posts.length === 0) {
        return header + footer;
    }
    
    return header + article + footer;
}
