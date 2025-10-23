# Move `tests/` into `test/`

## Challenge
Moving the nested suites from `tests/` into the existing `test/` tree risked `mv` errors because the destination directories already contained similarly named folders.

## Resolution
Relocated each nested suite into its matching destination folder individually, confirmed the files appeared under `test/`, and removed the now-empty `tests/` directory.
