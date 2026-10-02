import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'docs', 'toys');
const blogPath = path.join(process.cwd(), 'src', 'build', 'blog.json');
const blog = JSON.parse(fs.readFileSync(blogPath, 'utf8'));
const manuals = [];

for (const name of fs.readdirSync(root)) {
  if (name === '_template') continue;
  const file = path.join(root, name, 'manual.md');
  if (!fs.existsSync(file)) continue;
  const markdown = fs.readFileSync(file, 'utf8').trimEnd();
  const codeMatch = markdown.match(/^# ([A-Z]+\d+) —/m);
  const titleMatch = markdown.match(/^# (?:Toy Spec: )?(.+)$/m);
  const manualTitle = titleMatch?.[1]?.replace(/ Spec$/, '');
  const existing = blog.posts.find(candidate =>
    (candidate.content ?? []).some(item => item?.type === 'manual' &&
      (item.src === `/manuals/${name}.md` || item.markdown?.match(/^# (?:Toy Spec: )?(.+)$/m)?.[1]?.replace(/ Spec$/, '') === manualTitle))
  );
  const post = codeMatch
    ? blog.posts.find(candidate => candidate.key === codeMatch[1])
    : blog.posts.find(candidate => candidate.title === manualTitle) ?? existing;
  if (!post) throw new Error(`${name}: no matching blog post`);
  manuals.push({ code: post.key, src: `/manuals/${name}.md` });
}

for (const { code, src } of manuals) {
  const post = blog.posts.find(candidate => candidate.key === code);
  if (!post) throw new Error(`No blog post for ${code}`);
  const existing = post.content.find(item => item?.type === 'manual');
  if (existing) {
    delete existing.markdown;
    delete existing.content;
    existing.src = src;
  } else {
    post.content.push({ type: 'manual', id: `${code}-manual`, title: 'User manual', src });
  }
}

fs.writeFileSync(blogPath, `${JSON.stringify(blog, null, 2)}\n`);
