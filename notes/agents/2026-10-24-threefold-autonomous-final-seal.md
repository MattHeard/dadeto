# Threefold autonomous Final Seal

- Unexpected hurdle: the player-facing warning promised an independently prepared Assembly plan, but the tide reducer never changed the seal unless Mara operated it.
- Diagnosis: the reducer already advanced in deterministic action-time steps, but had no persisted faction-plan transition or resolved state. Simply closing the seal at the milestone would also erase the player's chance to intervene and risk replaying the event after import.
- Fix: add a one-shot persisted plan state, commit only at the 1,800-second action-time milestone when Assembly and hardware survive, expose a reachable interruption operation, and migrate old saves without retroactive actions. The campaign outcome envelope advances to schema v5.
- Next time: model autonomous faction commitments as saved world state with explicit pending, committed, interrupted, and unavailable outcomes; test both the clock boundary and restore behavior.
