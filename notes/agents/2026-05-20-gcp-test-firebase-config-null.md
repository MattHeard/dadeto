# gcp-test firebase config null

- Hurdle: the new GCP seed step crashed before seeding because `WEB_APP_CONFIG_JSON` was `null`.
- Diagnosis: the workflow was reading `terraform output -json firebase_web_app_config` as though it always returned the wrapped `{ value: ... }` shape, but the seed step was getting the raw output shape and `jq -c '.value'` collapsed it to `null`.
- Fix: normalize the Terraform output in the workflow before passing it to the seed script, so both wrapped and raw JSON shapes resolve to the actual Firebase config object.
- Next time: treat Terraform output shape as an interface and avoid hard-coding a single `jq` path unless the exact output format is verified in the workflow itself.
