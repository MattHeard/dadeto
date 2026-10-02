# Mosslight readable feedback and Start guide

Screenshot 19191 exposed two shared-simulation defects: every tick cleared the
toast (including embedded keypad key release), and journal mode had no embedded
canvas presentation. Feedback now remains until another message replaces it.
Start/J and noticeboards open a normal paged dialogue with the story premise,
controls, activity hints and live quest statuses. B/X dismisses the guide;
advancing its last page returns to exploration (or an existing battle).

Both presenters use the same dialogue layout. Do not clear feedback on idle
ticks or implement instructions only in page HTML: the embedded toy must also
render them. Regression tests are mosslightGuide.test.js and guide.spec.ts.
The older hotkey test now dismisses the guide through the actual cancel action
rather than forcing mode to world while leaving an open dialogue.

Evidence is recorded in dadeto-7l1o. Logs live at .tmp/mosslight-guide-tests.log,
.tmp/mosslight-guide-playwright.log and .tmp/mosslight-guide-check.log.
Repository-wide duplication repair remains separately owned by dadeto-aaou.
