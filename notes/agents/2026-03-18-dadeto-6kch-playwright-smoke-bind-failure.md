# dadeto-6kch: Classify Playwright smoke startup hang with timeout + logs

- Unexpected hurdle: the bounded smoke run stopped before Playwright bootstrap because the writer server could not bind to port `4321`.
- Diagnosis path: ran `timeout 25s npm run start:writer:playwright > /tmp/dadeto-6kch.start.log 2>&1` and inspected the captured log tail.
- Chosen fix: no code change in this loop; classify the failure boundary as local server startup blocked by the sandbox/environment.
- Next-time guidance: rerun the smoke from a full shell or less restricted environment, then continue only if the server binds cleanly and the next boundary moves into Playwright or Chromium startup.
