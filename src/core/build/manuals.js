/**
 * Publish canonical manual sources referenced by the blog manifest.
 * @param {{posts: Array<{content?: Array<{type?: string, src?: string}>}>}} blog Blog manifest.
 * @param {Pick<typeof import('node:fs'), 'mkdirSync' | 'copyFileSync'>} io Filesystem adapter.
 * @returns {void}
 */
export function publishManuals(blog, io) {
  io.mkdirSync('public/manuals', { recursive: true });
  for (const post of blog.posts) {
    for (const entry of post.content ?? []) {
      if (entry.type === 'manual' && entry.src) {
        const name = entry.src.match(/^\/manuals\/([a-z0-9-]+)\.md$/)?.[1];
        if (!name) {
          throw new Error(`Invalid manual source: ${entry.src}`);
        }
        io.copyFileSync(
          `docs/toys/${name}/manual.md`,
          `public/manuals/${name}.md`
        );
      }
    }
  }
}
