# JoyCon Mapper Remaining Coverage Checklist

`src/core/browser/inputHandlers/joyConMapper.js` still has several uncovered branch clusters. These are grouped by helper area so the next pass can stay bounded.

## Setup And Storage

- [x] `getClosestArticle()` guard when `container.closest` is missing
- [x] `getAutoSubmitCheckbox()` guard when no article wrapper is found
- [ ] `enableAutoSubmit()` guard when the checkbox is absent
- [ ] `readConnectedGamepads()` guard when `navigator.getGamepads` is missing
- [ ] `snapshotGamepad()` guard when the gamepad is missing
- [ ] `createElement()` default-options path and `applyCreatedElementOptions()` nullish normalization
- [ ] `readStoredMapperState()` fallback path when stored data cannot be parsed
- [ ] `normalizeStoredMapperState()` guard for non-object stored roots
- [ ] `normalizeStoredMappings()` guard for non-object mappings
- [ ] `normalizeSkippedControls()` guard for non-array skipped controls

## Capture Detection

- [ ] `detectButtonCapture()` missing-snapshot path
- [ ] `makeButtonCaptureReducer()` threshold and press-transition branches
- [ ] `findStrongestButtonCapture()` candidate/best selection branches
- [ ] `detectAxisCapture()` missing-snapshot path
- [ ] `makeAxisCaptureReducer()` direction, threshold, and candidate selection branches

## Row State And Labels

- [ ] `getCurrentControlKey()` null-control branch
- [ ] `getStoredControlCapture()` missing stored capture branch
- [ ] `getPendingRowState()` started vs not-started path
- [ ] `getPendingRowStateForStarted()` current-index match branch
- [ ] `getUnmappedRowState()` skipped-control branch
- [ ] `getRowState()` done-vs-unmapped split
- [ ] `getRowValueText()` mapped vs unmapped split

## Prompt And Render Flow

- [ ] `isPromptComplete()` index-complete branch
- [ ] `getStartedPromptCopy()` complete-vs-active prompt split
- [ ] `getConnectedPromptCopy()` started-vs-not-started split
- [ ] `getActivePromptText()` button-vs-axis prompt split
- [ ] `renderPrompt()` connected-vs-disconnected split
- [ ] `renderMeta()` connected-vs-disconnected split

## Capture Loop And Control Flow

- [ ] `maybeCapture()` skip branch when capture should not run
- [ ] `shouldSkipCapture()` started/current-control guard
- [ ] `updateCaptureState()` capture-vs-no-capture branch
- [ ] `detectCurrentControlCapture()` button-vs-axis split
- [ ] `handleJoyConMapperStart()` start-path render/sync branches
- [ ] `handleJoyConMapperSkip()` skip-path payload branches
- [ ] `handleJoyConMapperReset()` reset-path baseline branches
- [ ] `joyConMapperHandler()` initial state branches for stored state and current control
