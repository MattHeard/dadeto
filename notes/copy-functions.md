# Functions in `src/generator/copy.js`

## Core functions
- `isCorrectJsFileEnding(entryName)` – identifies JS files based on their filename suffix without relying on filesystem helpers.

## External-dependent functions
- `formatPathForLog(targetPath)` – formats paths using Node's `path` utilities.
- `isJsFile(entry)` – depends on the `fs.Dirent` interface.
- `shouldCheckEntry(entry)` – uses `isJsFile` and therefore inherits its dependency on `fs.Dirent`.
- `getActualNewFiles(entry, fullPath, listEntries)` – either recurses into directories or returns file paths, requiring filesystem directory listings.
- `getPossibleNewFiles(entry, fullPath, listEntries)` – leverages `getActualNewFiles` after checking filesystem-derived metadata.
- `accumulateJsFiles(jsFiles, entry, dir, listEntries)` – builds new paths with `path.join` and reads filesystem metadata.
- `findJsFiles(dir, listEntries)` – walks directory trees by invoking the provided directory reader.
- `createCopyPairs(files, sourceRoot, destinationRoot)` – assembles destination paths with `path.join` and `path.relative`.
- `ensureDirectoryExists(io, targetDir)` – relies on filesystem helpers to inspect and create directories.
- `copyFileWithDirectories(io, source, destination, messageLogger, message)` – combines filesystem operations and path formatting helpers.
- `copyFilePairs(copyPairs, io, messageLogger)` – iterates over copy pairs and performs filesystem copies.
- `handleDirectoryEntry(entry, src, dest, io, messageLogger)` – decides between directory recursion and file copying via filesystem helpers.
- `processDirectoryEntries(entries, src, dest, io, messageLogger)` – iterates over directory entries and delegates to filesystem-aware helpers.
- `copyDirRecursive(src, dest, io, messageLogger)` – performs recursive directory traversal with filesystem helpers.
- `copyDirectoryTreeIfExists(plan, io, messageLogger)` – checks for directory existence and initiates recursive copies.
- `copyBlogJson(dirs, io, messageLogger)` – copies the `blog.json` file using filesystem helpers.
- `copyToyFiles(dirs, io, messageLogger)` – finds JavaScript files via filesystem listings and copies them.
- `copyPresenterFiles(dirs, io, messageLogger)` – inspects directories, enumerates files, and copies them with filesystem helpers.
- `copySupportingDirectories(dirs, io, messageLogger)` – orchestrates multiple directory copy plans with filesystem helpers.
- `main(io, messageLogger)` – orchestrates the workflow, invoking filesystem-dependent helpers and `path` utilities indirectly.
