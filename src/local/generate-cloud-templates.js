import { readFileSync, promises as fs } from 'node:fs';
import prettier from 'prettier';
import {
  createCloudTemplateHandle,
  CLOUD_TEMPLATE_OUTPUT,
} from '../core/local/cloud-templates.js';
import { bindEffectBoundary } from './allow-effects.js';

const handle = createCloudTemplateHandle({
  readFile: path => readFileSync(path, 'utf8'),
  writeFile: (_permission, path, source) => fs.writeFile(path, source),
  formatSource: async source =>
    prettier.format(source, {
      ...(await prettier.resolveConfig(CLOUD_TEMPLATE_OUTPUT)),
      parser: 'babel',
    }),
  bindEffectBoundary,
});

handle(process.argv.includes('--check'))
  .then(() => {
    console.log('Cloud template data matches the checked-in HTML.');
  })
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

export { handle };
