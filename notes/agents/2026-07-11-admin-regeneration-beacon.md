# Admin regeneration beacon routing

- Unexpected hurdle: the first full gate exhausted the 2 GiB `/tmp` filesystem with Jest transform cache files.
- Diagnosis: the regeneration handler caught non-OK responses locally and had no reportError dependency, even though initAdmin already owned the beacon reporter.
- Fix: thread reportError into createRegenerateVariant and report caught regeneration failures before updating the UI.
- Next time: clear `/tmp/jest_rs` between repeated full coverage runs if disk usage approaches capacity.
