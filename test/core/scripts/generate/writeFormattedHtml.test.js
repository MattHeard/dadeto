import { jest } from '@jest/globals';

import { createWriteFormattedHtml } from '../../../../src/core/build/buildCore.js';

describe('createWriteFormattedHtml', () => {
  const baseDependencies = () => {
    return {
      generateHtml: jest.fn().mockReturnValue('<html></html>'),
      resolveConfig: jest.fn().mockResolvedValue({ tabWidth: 4 }),
      formatHtml: jest.fn().mockImplementation((html, options) => {
        return `${html}-formatted(${options.parser})`;
      }),
      writeFile: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn(),
    };
  };

  it('formats generated HTML and writes it to disk when formatting succeeds', async () => {
    const deps = baseDependencies();
    const writeFormattedHtml = createWriteFormattedHtml(deps);

    await writeFormattedHtml({
      blog: { title: 'Test Blog' },
      configPath: './.prettierrc',
      outputPath: 'public/index.html',
      encoding: 'utf8',
      parser: 'html',
    });

    expect(deps.generateHtml).toHaveBeenCalledWith({ title: 'Test Blog' });
    expect(deps.resolveConfig).toHaveBeenCalledWith('./.prettierrc');
    expect(deps.formatHtml).toHaveBeenCalledWith('<html></html>', {
      tabWidth: 4,
      parser: 'html',
    });
    expect(deps.writeFile).toHaveBeenCalledWith(
      'public/index.html',
      '<html></html>-formatted(html)',
      'utf8'
    );
    expect(deps.logInfo).toHaveBeenCalledTimes(1);
    expect(deps.logInfo).toHaveBeenCalledWith(
      'HTML formatted with Prettier and written to public/index.html'
    );
    expect(deps.logError).not.toHaveBeenCalled();
  });

  it('falls back to writing unformatted HTML when formatting throws', async () => {
    const deps = baseDependencies();
    const formattingError = new Error('prettier failed');
    deps.formatHtml.mockImplementation(() => {
      throw formattingError;
    });

    const writeFormattedHtml = createWriteFormattedHtml(deps);

    await writeFormattedHtml({
      blog: { title: 'Fallback Blog' },
      configPath: './.prettierrc',
      outputPath: 'public/index.html',
      encoding: 'utf8',
      parser: 'html',
    });

    expect(deps.resolveConfig).toHaveBeenCalledWith('./.prettierrc');
    expect(deps.writeFile).toHaveBeenCalledWith(
      'public/index.html',
      '<html></html>',
      'utf8'
    );
    expect(deps.logError).toHaveBeenCalledWith(
      'Error formatting HTML',
      formattingError
    );
    expect(deps.logInfo).toHaveBeenLastCalledWith(
      'Unformatted HTML written to public/index.html'
    );
  });

  it('uses default parser and empty config when resolveConfig returns null', async () => {
    const deps = baseDependencies();
    deps.resolveConfig.mockResolvedValue(null);
    const writeFormattedHtml = createWriteFormattedHtml(deps);

    await writeFormattedHtml({
      blog: { title: 'Defaults' },
      configPath: './missing-prettier',
      outputPath: 'public/defaults.html',
    });

    expect(deps.formatHtml).toHaveBeenCalledWith('<html></html>', {
      parser: 'html',
    });
    expect(deps.writeFile).toHaveBeenCalledWith(
      'public/defaults.html',
      '<html></html>-formatted(html)',
      'utf8'
    );
    expect(deps.logInfo).toHaveBeenCalledWith(
      'HTML formatted with Prettier and written to public/defaults.html'
    );
  });

  it('logs and writes the raw HTML when resolving the config fails', async () => {
    const deps = baseDependencies();
    const configError = new Error('config missing');
    deps.resolveConfig.mockRejectedValue(configError);
    const writeFormattedHtml = createWriteFormattedHtml(deps);

    await writeFormattedHtml({
      blog: { title: 'Config Failure' },
      configPath: './missing',
      outputPath: 'public/fallback.html',
    });

    expect(deps.formatHtml).not.toHaveBeenCalled();
    expect(deps.writeFile).toHaveBeenCalledWith(
      'public/fallback.html',
      '<html></html>',
      'utf8'
    );
    expect(deps.logError).toHaveBeenCalledWith(
      'Error formatting HTML',
      configError
    );
    expect(deps.logInfo).toHaveBeenLastCalledWith(
      'Unformatted HTML written to public/fallback.html'
    );
  });
});
