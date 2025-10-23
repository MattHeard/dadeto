# Branch coverage adjustments

- Targeted `src/core/cloud/generate-stats/core.js` after noticing the metadata env normalization branch still lacked coverage despite extensive tests.
- Exercised the missing edge cases (undefined env input and non-object env values) in `test/cloud-functions/generateStats.test.js`, then reran the full Jest suite to verify branch coverage reached 100%.
