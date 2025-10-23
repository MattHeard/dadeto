# Notes

- Reduced the parameter count for `copyFileWithDirectories` by threading copy details through a single options bag so the helper stays under the lint threshold.
- Updated each caller to supply the object payload, keeping optional log messages intact without altering runtime behavior.
