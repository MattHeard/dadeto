import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { bindEffectBoundary } from './allow-effects.js';
import { parse } from 'acorn';
import { pathToFileURL } from 'node:url';
import { createCloudFunctionPackageVerifier } from '../core/local/cloud-function-package-closure.js';

const coreFactory = createCloudFunctionPackageVerifier;
const handle = coreFactory(parse, path, builtinModules);
export const main = (options = {}) =>
  bindEffectBoundary(permission =>
    handle.main(permission, {
      rootDirectory: options.rootDirectory ?? process.cwd(),
      fileSystem: options.fileSystem ?? fs,
      writeLine: (_permission, line) =>
        (options.writeLine ?? console.log)(line),
    })
  );

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
