import fs from 'node:fs';
import {
  createGeneratorHandle,
  createIdAttributeIfNeeded,
  defaultKeyExtraClasses,
  getDefaultInputMethod,
  getDefaultOutputMethod,
  getSelectedMethod,
} from '../../src/core/build/generator.js';

const fixtureRoot = 'test/fixtures/generator-typing';
const blog = JSON.parse(fs.readFileSync(`${fixtureRoot}/blog.json`, 'utf8'));
const generator = createGeneratorHandle({
  renderStaticJsonlTable: entry => `<table>${JSON.stringify(entry)}</table>`,
});

test.each(['complete', 'fragments'])(
  '%s HTML matches the pre-typing implementation byte for byte',
  name => {
    const input = structuredClone(blog);
    let actual;
    if (name === 'complete') actual = generator.generateBlogOuter(input);
    else {
      actual = generator.generateBlog(
        { blog: input, header: '<before>', footer: '<after>' },
        html => `<outer>${html}</outer>`
      );
    }
    const expected = fs.readFileSync(`${fixtureRoot}/${name}.html`, 'utf8');
    // Keep exact equality without computing a huge HTML diff for every mutant.
    expect(actual === expected).toBe(true);
    expect(input).toEqual(blog);
  }
);

test('public helper contracts preserve defaults, overrides and object identity', () => {
  const missing = {};
  expect(defaultKeyExtraClasses(missing)).toBe(missing);
  expect(missing).toEqual({ keyExtraClasses: '' });
  const supplied = { keyExtraClasses: 'custom' };
  expect(defaultKeyExtraClasses(supplied)).toBe(supplied);
  expect(supplied).toEqual({ keyExtraClasses: 'custom' });
  expect(createIdAttributeIfNeeded({ key: 'POST' })).toBe(' id="POST"');
  expect(getSelectedMethod('text')).toBeUndefined();
  expect(getSelectedMethod('number')).toBe('number');
  expect(getSelectedMethod(undefined)).toBeUndefined();
  expect(getDefaultInputMethod({})).toBe('text');
  expect(getDefaultInputMethod({ toy: {} })).toBeUndefined();
  expect(getDefaultInputMethod({ toy: { defaultInputMethod: 'file' } })).toBe(
    'file'
  );
  expect(getDefaultOutputMethod({})).toBeUndefined();
  expect(getDefaultOutputMethod({ toy: { defaultOutputMethod: 'pre' } })).toBe(
    'pre'
  );
});

test('header/footer helpers compose the same empty page', () => {
  const { header, footer, wrapFunc } = generator.getBlogGenerationArgs();
  expect(wrapFunc(header + footer)).toBe(
    generator.generateBlogOuter({ posts: [] })
  );
});

test.each([
  {
    name: 'non-array body',
    content: 'invalid',
    message: 'Post content must be an array',
    error: TypeError,
  },
  {
    name: 'untyped body object',
    content: [{}],
    message:
      'Every post body entry must have a type; renderer is not a function',
    error: TypeError,
  },
  {
    name: 'unknown type',
    content: [{ type: 'mystery' }],
    message:
      'Unknown post body entry type: mystery; renderer is not a function',
    error: Error,
  },
  {
    name: 'duplicate toy',
    content: [{ type: 'toy' }, { type: 'toy' }],
    message: 'A post may contain at most one toy marker',
    error: Error,
  },
  {
    name: 'unconfigured toy',
    content: [{ type: 'toy' }],
    message: 'A toy marker requires a configured post toy',
    error: Error,
  },
  {
    name: 'empty links',
    content: [{ type: 'links', content: [] }],
    message: 'Links body entry must contain a non-empty array',
    error: TypeError,
  },
  {
    name: 'non-array links',
    content: [{ type: 'links', content: 'invalid' }],
    message: 'Links body entry must contain a non-empty array',
    error: TypeError,
  },
])(
  'rejects $name with its existing error contract',
  ({ content, message, error }) => {
    const render = () =>
      generator.generateBlogOuter({
        posts: [
          {
            key: 'BAD',
            title: 'Invalid',
            publicationDate: '2026-01-01',
            content,
          },
        ],
      });
    expect(render).toThrow(error);
    expect(render).toThrow(message);
  }
);

test('table and outer wrapper errors propagate unchanged', () => {
  const failure = new Error('dependency failed');
  const failing = createGeneratorHandle({
    renderStaticJsonlTable() {
      throw failure;
    },
  });
  expect(() => failing.generateBlogOuter(blog)).toThrow(failure);
  expect(() =>
    generator.generateBlog(
      { blog: { posts: [] }, header: '', footer: '' },
      () => {
        throw failure;
      }
    )
  ).toThrow(failure);
});
