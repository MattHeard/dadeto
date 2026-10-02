# Confirmed single-slot Mosslight reset

Reset is an explicit shared runtime operation, not removal of all permanentData. `runtime.resetSave()` creates a pristine simulation from injected content, clears the fixed-step accumulator, stops prior audio cues and immediately persists only the active slot. It preserves slot identity, other slots, unrelated toys' data and the running/paused lifecycle.

The standalone Reset save button and the embedded keypad's separate Reset game button use the same slot-specific confirmation prompt. The prompt warns that progress is erased and recommends exporting first. The embedded preview uses slot01 and requires both reset:true and confirmed:true in its submitted payload; an unconfirmed request is read-only and does not consume a simulation tick. The page clears held keyboard/touch inputs after reset so the fresh character cannot inherit old movement. Imported slots now also synchronize the slot selector with the runtime before later resets.

Recovery is possible only from an exported backup. No user production save is changed by deployment: overwrite occurs only after the user confirms. Browser regression fixtures are disposable local saves; pause the runtime before writing them to avoid the prior autosave race.

Focused evidence: `.tmp/mosslight-reset-jest.log` passed88 tests/10suites with exact100% statements/branches/functions/lines across save,runtime,mosslightValley,pagePresenter,keypad (`.tmp/mosslight-reset-coverage`). Lint, TSdoc and build passed. `.tmp/mosslight-reset-browser-focused.log` passed all4 reset journeys (phone/desktop, page/preview): cancel leaves storage unchanged; confirmation clears the adventure, preserves another slot/unrelated data and survives reload. Duplication remains at138 in `.tmp/mosslight-reset-duplication.log`, with no additional matches or suppression.

Full local browser suite `.tmp/mosslight-reset-browser.log` passed37 tests with3 existing skips, including all prior handheld layout, crossings, guide/journal and WebMCP regressions. The mobile reset button does not disrupt the screen/keypad viewport layout.
