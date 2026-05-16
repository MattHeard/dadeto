# Local server systemd note

- Hurdle: the repo already had a systemd unit for the Notion Symphony poller, but nothing for the local writer server / non-core-thin dashboard.
- Diagnosis: the local server already supports LAN binding through `npm run start:writer:lan`, so the missing piece was just a matching unit file under `ops/systemd/`.
- Fix: added `ops/systemd/dadeto-local-server.service` to run `npm run start:local` from `/home/matt/dadeto` with `Restart=always`.
- Next time: if Lorandil should run this automatically on boot, install/enable the unit in the user session and verify the host has `WRITER_HOST=0.0.0.0` access as expected.
