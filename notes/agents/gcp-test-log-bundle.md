Unexpected hurdle: failures in the GCP E2E workflow were only leaving the live cloud job logs visible during the run, which makes later inspection fragile once the ephemeral environment is torn down.

Diagnosis: the workflow already printed Cloud Run output inline, but it did not guarantee a durable artifact for the execution describe/task describe data. That meant postmortems still depended on catching the live run in time.

Chosen fix: extend the `gcp-test` workflow to write the Cloud Run execution describe, task describe, and job log JSON to `/tmp` and upload them as artifacts before teardown.

Next-time guidance: when investigating cloud-ephemeral failures, prefer a workflow artifact first. Console output is useful, but it should not be the only copy of the evidence.
