# Neuronpedia native MLP ID validation

- Unexpected hurdle: Neuronpedia's feature API, source export, model export, and Available Resources page disagree on visibility, inference availability, and MLP width for `circuitgpt-python/0-mlp`.
- Diagnosis: compare the live feature GETs with the source/model/source-set JSONL export rows; the source row says public but inference-disabled, while the model row advertises inference and a different width. The Available Resources page also marks the source as not inference-enabled.
- Fix: capture the exact responses and pin the candidate Hugging Face revision instead of normalizing the conflicting metadata. Public IDs 0, 99, 100, 2047, and 2048 all returned matching records, proving the minimum 100-ID criterion for reads.
- Next time: require per-source replay evidence and reconcile the upstream checkpoint/data provenance before treating index bounds or inference metadata as authoritative; keep the Bead and parent spec open for this follow-up.
