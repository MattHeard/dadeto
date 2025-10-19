export const sharedDirectoryPairs = [
  { key: 'Toys', relativePath: 'core/toys' },
  { key: 'Browser', relativePath: 'browser' },
  { key: 'InputHandlers', relativePath: 'inputHandlers' },
  { key: 'Constants', relativePath: 'constants' },
  { key: 'Presenters', relativePath: 'presenters' },
  { key: 'Core', relativePath: 'core' },
];

export function createSharedDirectoryEntries({
  path: pathDeps,
  srcDir,
  publicDir,
  pairs = sharedDirectoryPairs,
}) {
  const { join } = pathDeps;
  return pairs.flatMap(({ key, relativePath }) => {
    const srcKey = `src${key}Dir`;
    const destKey = `public${key}Dir`;
    const srcPath = join(srcDir, relativePath);
    const destPath = join(publicDir, relativePath);
    return [
      [srcKey, srcPath],
      [destKey, destPath],
    ];
  });
}

export function createCopyCore({ directories: dirConfig, path: pathDeps }) {
  const { join, dirname, relative } = pathDeps;

  function formatPathForLog(targetPath) {
    const relativePath = relative(dirConfig.projectRoot, targetPath);
    if (!relativePath) {
      return '.';
    }
    if (relativePath.startsWith('..')) {
      return targetPath;
    }
    return relativePath;
  }

  function isCorrectJsFileEnding(entryName) {
    return entryName.endsWith('.js') && !entryName.endsWith('.test.js');
  }

  function isJsFile(entry) {
    return entry.isFile() && isCorrectJsFileEnding(entry.name);
  }

  function shouldCheckEntry(entry) {
    return entry.isDirectory() || isJsFile(entry);
  }

  function getActualNewFiles(entry, fullPath, listEntries) {
    if (entry.isDirectory()) {
      return findJsFiles(fullPath, listEntries);
    }
    return [fullPath];
  }

  function getPossibleNewFiles(entry, fullPath, listEntries) {
    if (shouldCheckEntry(entry)) {
      return getActualNewFiles(entry, fullPath, listEntries);
    }
    return [];
  }

  function accumulateJsFiles(jsFiles, entry, dir, listEntries) {
    const fullPath = join(dir, entry.name);
    const newFiles = getPossibleNewFiles(entry, fullPath, listEntries);
    return jsFiles.concat(newFiles);
  }

  function findJsFiles(dir, listEntries) {
    const entries = listEntries(dir);
    return entries.reduce(
      (jsFiles, entry) => accumulateJsFiles(jsFiles, entry, dir, listEntries),
      []
    );
  }

  function createCopyPairs(files, sourceRoot, destinationRoot) {
    return files.map(filePath => ({
      source: filePath,
      destination: join(
        destinationRoot,
        relative(sourceRoot, filePath)
      ),
    }));
  }

  function ensureDirectoryExists(io, targetDir) {
    if (!io.directoryExists(targetDir)) {
      io.createDirectory(targetDir);
    }
  }

  function copyFileWithDirectories(
    io,
    source,
    destination,
    messageLogger,
    message
  ) {
    ensureDirectoryExists(io, dirname(destination));
    io.copyFile(source, destination);
    const relativeSource = formatPathForLog(source);
    const relativeDestination = formatPathForLog(destination);
    const logMessage =
      message ?? `Copied: ${relativeSource} -> ${relativeDestination}`;
    messageLogger.info(logMessage);
  }

  function copyFilePairs(copyPairs, io, messageLogger) {
    copyPairs.forEach(({ source, destination }) => {
      copyFileWithDirectories(io, source, destination, messageLogger);
    });
  }

  function handleDirectoryEntry(entry, src, dest, io, messageLogger) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, io, messageLogger);
      return;
    }
    copyFileWithDirectories(io, srcPath, destPath, messageLogger);
  }

  function processDirectoryEntries(entries, src, dest, io, messageLogger) {
    entries.forEach(entry => {
      handleDirectoryEntry(entry, src, dest, io, messageLogger);
    });
  }

  function copyDirRecursive(src, dest, io, messageLogger) {
    ensureDirectoryExists(io, dest);
    const entries = io.readDirEntries(src);
    processDirectoryEntries(entries, src, dest, io, messageLogger);
  }

  function copyDirectoryTreeIfExists(plan, io, messageLogger) {
    const { src, dest, successMessage, missingMessage } = plan;
    if (!io.directoryExists(src)) {
      messageLogger.warn(missingMessage);
      return;
    }
    copyDirRecursive(src, dest, io, messageLogger);
    messageLogger.info(successMessage);
  }

  function copyBlogJson(dirs, io, messageLogger) {
    copyFileWithDirectories(
      io,
      dirs.srcBlogJson,
      dirs.publicBlogJson,
      messageLogger,
      'Copied: src/blog.json -> public/blog.json'
    );
  }

  function copyToyFiles(dirs, io, messageLogger) {
    const toyFiles = findJsFiles(dirs.srcToysDir, io.readDirEntries);
    const copyPairs = createCopyPairs(
      toyFiles,
      dirs.srcToysDir,
      dirs.publicDir
    );
    copyFilePairs(copyPairs, io, messageLogger);
    messageLogger.info('Toy files copied successfully!');
  }

  function copyPresenterFiles(dirs, io, messageLogger) {
    if (!io.directoryExists(dirs.srcPresentersDir)) {
      messageLogger.warn(
        `Warning: presenters directory not found at ${formatPathForLog(
          dirs.srcPresentersDir
        )}`
      );
      return;
    }
    const presenterFiles = findJsFiles(
      dirs.srcPresentersDir,
      io.readDirEntries
    );
    const presenterPairs = createCopyPairs(
      presenterFiles,
      dirs.srcPresentersDir,
      dirs.publicPresentersDir
    );
    presenterPairs.forEach(({ source, destination }) => {
      copyFileWithDirectories(
        io,
        source,
        destination,
        messageLogger,
        `Copied presenter: ${formatPathForLog(source)} -> ${formatPathForLog(
          destination
        )}`
      );
    });
    messageLogger.info('Presenter files copied successfully!');
  }

  function copyBrowserAudioControls(dirs, io, messageLogger) {
    const source = dirs.srcCoreBrowserAudioControlsFile;
    if (!io.directoryExists(source)) {
      messageLogger.warn(
        `Warning: audio controls file not found at ${formatPathForLog(source)}`
      );
      return;
    }

    copyFileWithDirectories(
      io,
      source,
      dirs.publicBrowserAudioControlsFile,
      messageLogger,
      'Copied: src/core/browser/audio-controls.js -> public/browser/audio-controls.js'
    );
  }

  function copySupportingDirectories(dirs, io, messageLogger) {
    const plans = [
      {
        src: dirs.srcInputHandlersDir,
        dest: dirs.publicInputHandlersDir,
        successMessage: 'Input handler files copied successfully!',
        missingMessage: `Warning: inputHandlers directory not found at ${formatPathForLog(
          dirs.srcInputHandlersDir
        )}`,
      },
      {
        src: dirs.srcConstantsDir,
        dest: dirs.publicConstantsDir,
        successMessage: 'Constants files copied successfully!',
        missingMessage: `Warning: constants directory not found at ${formatPathForLog(
          dirs.srcConstantsDir
        )}`,
      },
      {
        src: dirs.srcCoreDir,
        dest: dirs.publicCoreDir,
        successMessage: 'Core files copied successfully!',
        missingMessage: `Warning: core directory not found at ${formatPathForLog(
          dirs.srcCoreDir
        )}`,
      },
      {
        src: dirs.srcAssetsDir,
        dest: dirs.publicAssetsDir,
        successMessage: 'Asset files copied successfully!',
        missingMessage: `Warning: assets directory not found at ${formatPathForLog(
          dirs.srcAssetsDir
        )}`,
      },
      {
        src: dirs.srcBrowserDir,
        dest: dirs.publicBrowserDir,
        successMessage: 'Browser files copied successfully!',
        missingMessage: `Warning: browser directory not found at ${formatPathForLog(
          dirs.srcBrowserDir
        )}`,
      },
    ];

    plans.forEach(plan => {
      copyDirectoryTreeIfExists(plan, io, messageLogger);
    });
  }

  function runCopyWorkflow({ directories: dirs, io, messageLogger }) {
    ensureDirectoryExists(io, dirs.publicDir);
    copyBlogJson(dirs, io, messageLogger);
    copyToyFiles(dirs, io, messageLogger);
    copyPresenterFiles(dirs, io, messageLogger);
    copyBrowserAudioControls(dirs, io, messageLogger);
    copySupportingDirectories(dirs, io, messageLogger);
  }

  return {
    formatPathForLog,
    isCorrectJsFileEnding,
    isJsFile,
    shouldCheckEntry,
    getActualNewFiles,
    getPossibleNewFiles,
    accumulateJsFiles,
    findJsFiles,
    createCopyPairs,
    ensureDirectoryExists,
    copyFileWithDirectories,
    copyFilePairs,
    handleDirectoryEntry,
    processDirectoryEntries,
    copyDirRecursive,
    copyDirectoryTreeIfExists,
    copyBlogJson,
    copyToyFiles,
    copyPresenterFiles,
    copyBrowserAudioControls,
    copySupportingDirectories,
    runCopyWorkflow,
  };
}

