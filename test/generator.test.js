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
                    content: ["First post content"],
                    illustration: {
                        fileType: "png",
                        altText: "a messy desk, digital art, black and white"
                    }
                },
                {
                    key: "SECO2",
                    title: "Second Post",
                    publicationDate: "2022-05-05",
                    content: [
                        "Second post content",
                        "Another paragraph"
                    ],
                    illustration: {
                        fileType: "png",
                        altText: "a tangle of yellow and black woollen yarn"
                    },
                    youtube: {
                        id: "EdlrqPPI_YQ",
                        title: "Lonely & Horny Episode 2 - Orion",
                        timestamp: 420
                    },
                    audio: {
                        fileType: "m4a",
                    }
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
      <p class="value metadata">4 May 2022</p>
      <div class="key media">illus</div>
      <div class="value">
        <img loading="lazy" src="2022-05-04.png" alt="a messy desk, digital art, black and white"/>
      </div>
      <div class="key">text</div>
      <p class="value">First post content</p>
    </article>
    <article class="entry" id="SECO2">
      <div class="key full-width">▄▄▄▄▄▄▄▄▄▄</div>
      <div class="value full-width">▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄</div>
      <div class="key article-title">SECO2</div>
      <div class="value"><h2><a href="#SECO2">Second Post</a></h2></div>
      <div class="key">pubAt</div>
      <p class="value metadata">5 May 2022</p>
      <div class="key media">illus</div>
      <div class="value">
        <img loading="lazy" src="2022-05-05.png" alt="a tangle of yellow and black woollen yarn"/>
      </div>
      <div class="key media">audio</div>
      <audio class="value" controls>
        <source src="2022-05-05.m4a">
      </audio>
      <div class="key media">video</div>
      <p class="value">
        <iframe height="300px" width="100%" src="https://www.youtube.com/embed/EdlrqPPI_YQ?start=420" title="Lonely &amp; Horny Episode 2 - Orion" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" loading="lazy" allowfullscreen></iframe>
      </p>
      <div class="key">text</div>
      <p class="value">Second post content</p>
      <div class="key"></div>
      <p class="value">Another paragraph</p>
    </article>
</body></html>`;

        const html = generateBlog(blog, header, footer, wrapHtml);
        expect(html).toBe(expectedHtml);
    });
});
