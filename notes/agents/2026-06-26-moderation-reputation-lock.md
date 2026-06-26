Unexpected hurdle: the admin lock rule needed to live on the moderation-rating trigger, not the variant updater alone, because the trigger knows which moderator submitted the rating.

Diagnosis: the visibility pipeline only had access to the variant snapshot. Once the payload carried `moderatorId`, the lock could be applied deterministically and later ratings could preserve the locked visibility.

Chosen fix: keep the normal visibility aggregation for non-admin ratings, then apply a second admin-only write that freezes `visibility` and marks `visibilityLockedBy`. The daily reputation job now writes only `moderatorReputation`.

Next-time guidance: keep new moderation policy tests explicit about the trigger payload shape so the admin path does not silently regress into snapshot-only behavior.
