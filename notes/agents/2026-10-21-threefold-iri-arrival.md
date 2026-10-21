# THREEFOLD Iri arrival milestones

Owning Bead: dadeto-bgpg. Rank 1 remains Partial / Active; Return Tide is still outstanding.

The existing fate API could store authored states but every record was public. Timed offscreen changes therefore need a real distinction between physical occurrence and last observed knowledge. Schema v3 retains iriFate and an optional iriKnowledge only while a newer event is unobserved; existing v1/v2 records remain observed. Full backups must serialize the actual outcome envelope, not reconstruct it from a public snapshot.

Use the existing global action clock's 540/900-second tide milestones and facts committed before the crossing action. Split hydraulic advancement around events, reuse the shared pressure input reducer, and keep remaining action flow in the existing runtime path. Crew evacuation consumes the same finite governor; no duplicate component or new volume is introduced. Real gate repairs must be read through the existing gate outcome reducer. Terminal departures/deaths and old release/corpse evidence cannot create a living Iri.

Initial scenario failures were concrete fixture/import errors: the default spawn grows into a wall, not the relief gate; the simulation constructor requires thresholds; the ferry target is ferry-mooring-line; the Archive trace requires scale -1 even after its water crossing is ready. Assert the actual physical prerequisite before drawing a narrative conclusion. The actual-death tests now discover all three independent evidence routes rather than relying only on a manually assigned dead flag.

Related focused coverage, local aggregate/build/manual evidence, pushed commit and asynchronous Full Check are recorded separately on the Bead and Rank 1 Notion spec. While implementing, PR #2751's storage-denial review correction was isolated and pushed; do not conflate that earlier green head with the corrected head's pending CI. Keep evaluator temp files on the main filesystem when /tmp's small tmpfs fills.
