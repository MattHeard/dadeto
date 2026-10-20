import { parse } from 'acorn';
import { pathToFileURL } from 'node:url';
import { createCloudFunctionPackageVerifier } from '../core/local/cloud-function-package-closure.js';

const coreFactory = createCloudFunctionPackageVerifier;
const handle = coreFactory(parse, line => console.log(line));
export const main = handle.main;

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
