# JoyCon current-control capture mutation slice

- Unexpected hurdle: the full detector range generated ten mutants and exceeded the bounded scan window.
- Diagnosis path: split the detector into button and axis branches; the button scan produced five mutants, while the axis range produced no generated mutants.
- Chosen fix: added direct button-transition and positive-axis capture assertions, plus retained the null-control guard assertion.
- Evidence: the button verification scan killed all 5 mutants; the axis verification completed with zero generated mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: split mixed detector branches before scanning when the combined range produces too many mutants.
