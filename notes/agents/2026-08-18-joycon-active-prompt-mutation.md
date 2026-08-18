# JoyCon active-prompt mutation slice

- Unexpected hurdle: the active-prompt copy helper had only indirect coverage through started-state rendering.
- Diagnosis path: the bounded scan over lines 1498-1501 found one surviving template-string mutant.
- Chosen fix: exposed the pure helper through the test-only surface and asserted the button-control prompt and subprompt.
- Evidence: the verification scan killed the template-string mutant; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: assert interpolated prompt labels directly, including the control type that selects the subprompt.
