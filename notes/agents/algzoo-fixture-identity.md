# AlgZoo pinned fixture identity

- Unexpected hurdle: the launch plan checked the source revision and a subset of model metadata but did not validate the complete architecture or tensor payload.
- Diagnosis: `createAlgZooPilotPlan` trusted the parsed fixture's declared dimensions and accepted any parameter object.
- Fix: validate the pinned DistRNN/ReLU/no-bias M16,10 metadata plus the exact input, recurrent, and output tensor shapes and all 432 finite weights before producing a valid plan.
- Next-time guidance: when a preregistered model changes, update the frozen fixture identity and protocol together; retain negative tests for metadata and tensor corruption.
