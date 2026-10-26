import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

test('cloud output paths match the repository-root artifact uploader', async () => {
  const context = createContext({ process });
  const configModule = new SourceTextModule(
    readFileSync('test/e2e/cloud.config.ts', 'utf8'),
    { context }
  );
  await configModule.link(specifier => {
    const exports =
      specifier === 'node:path'
        ? { resolve }
        : { defineConfig: config => config };
    expect(['node:path', '@playwright/test']).toContain(specifier);
    return new SyntheticModule(
      Object.keys(exports),
      function () {
        for (const [name, value] of Object.entries(exports))
          this.setExport(name, value);
      },
      { context }
    );
  });
  await configModule.evaluate();
  const config = configModule.namespace.default;
  expect(config.outputDir).toBe(resolve('test-results'));
  const html = config.reporter.find(([name]) => name === 'html');
  expect(html[1]).toEqual({
    outputFolder: resolve('playwright-report'),
    open: 'never',
  });
  expect(config.reporter).toContainEqual(['list']);
});
