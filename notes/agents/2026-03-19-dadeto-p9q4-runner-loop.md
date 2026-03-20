# dadeto-p9q4 runner loop

- Unexpected hurdle: the sandboxed probe could not connect to `127.0.0.1:4321`.
- Diagnosis path: launched `npm run start:writer:playwright` under a 20s timeout, then probed `/api/writer/workflow` with `curl -fsS`.
- Chosen fix: none in this loop; the result classifies the failure as startup/connectivity, not a browser-launch or Playwright assertion issue.
- Next-time guidance: prove the writer server is reachable first, then retry the sandboxed Codex connection path before widening into e2e assertions.
