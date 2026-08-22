# Admin logger and sign-in mutation loop

- Unexpected hurdle: browser-global mutations caused expected child-process crashes in invalid dependency paths.
- Diagnosis: one survivor remained in the conjunction requiring both Google Identity methods.
- Fix: added direct true/false assertions for all method combinations.
- Evidence: final bounded Stryker scan for lines 1100-1500 reported 0 survivors and 0 timeouts; baseline passed 23 tests.
- Next-time guidance: test conjunctions with each operand independently absent; a happy-path object only proves the true branch.
