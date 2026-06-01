import { createGeneratorHandle } from '../core/build/generator.js';

const handle = createGeneratorHandle();

export const {
  defaultKeyExtraClasses, createIdAttributeIfNeeded, getSelectedMethod,
  getDefaultInputMethod, getDefaultOutputMethod, generateBlog,
  getBlogGenerationArgs, generateBlogOuter,
} = handle;

export { handle };
