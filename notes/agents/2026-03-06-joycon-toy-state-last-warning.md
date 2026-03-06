## dadeto-rwgr

- Scope: final bounded pass in `src/core/browser/toys/2026-03-01/joyConMapper.js` only.
- Result: reduced the toy-state file from 2 warnings to 1 warning.
- Landed shape:
  - simplified `handleAction` to a single next-state resolution path
  - split local permanent-data access so `getStoredValue` no longer carries the warning
- Remaining warning:
  - `getLocalPermanentDataRoot` complexity 3
- Next-time guidance: the last warning is now effectively the cost of the null-safe local-data read. More helper extraction is just moving the same branch budget around, so either accept it as local debt or rewrite the storage-read contract more substantially.
