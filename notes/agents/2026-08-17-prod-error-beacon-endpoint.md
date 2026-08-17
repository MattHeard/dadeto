# Production error beacon endpoint

- Unexpected hurdle: the static site’s relative `/prod-errors` path returned a Netlify 404.
- Diagnosis path: inspected the Terraform config and confirmed production error beacons are a GCP function at `europe-west1-irien-465710.cloudfunctions.net/prod-errors`; a CORS preflight returned 204 for `https://mattheard.net`.
- Chosen fix: point the shared browser main entry directly at the production GCP function and retain a no-op guard for any future unconfigured reporter.
- Next-time guidance: keep GCP endpoint generation/configuration centralized if additional static sites need the beacon.
