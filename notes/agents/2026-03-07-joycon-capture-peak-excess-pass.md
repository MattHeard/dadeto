## Joy-Con capture peak/excess pass

- Unexpected hurdle: lowering the capture callbacks' peak complexity by helper extraction still increased the file-level lint warning count, so the old count-only acceptance signal remained misleading even after the slice got materially simpler.
- Diagnosis path: compared the capture slice against `HEAD` with the local complexity-profile tool and checked the file-scoped ESLint JSON output to separate owned-slice complexity changes from unrelated pre-existing warnings elsewhere in `joyConMapper.js`.
- Chosen fix: split button and axis capture detection into small capture-only candidate/selection helpers so the hot callback bodies dropped from peak complexity 8/6 down to 3/3 while keeping all new warnings inside the owned capture slice.
- Next-time guidance: when a complexity bead is judged by peak/excess instead of raw warning count, record the baseline slice metrics first and then compare against the exact pre-change file content rather than the edited file alone.
