Unit tests use child processes through the coverage runner. The user explicitly approved those child processes.

Earlier unit-test attempts ended with the agent command session after roughly 29 seconds. That was not a project configuration failure or a cgroup OOM: approved child spawning and Jest test discovery both succeed, and the relevant cgroup reported no OOM events.

A longer-lived worker session is running `npm run test:unit` to collect the actual unit-test result. No end-to-end or aggregate test command is part of that attempt.
