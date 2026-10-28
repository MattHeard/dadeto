import { createGeneratorHandle } from '../core/build/generator.js';

import { renderStaticJsonlTable } from './staticJsonlTable.js';

const handle = createGeneratorHandle({ renderStaticJsonlTable });

export const {
  defaultKeyExtraClasses,
  createIdAttributeIfNeeded,
  getSelectedMethod,
  getDefaultInputMethod,
  getDefaultOutputMethod,
  generateBlog,
  getBlogGenerationArgs,
  generateBlogOuter,
} = handle;

export { handle };
