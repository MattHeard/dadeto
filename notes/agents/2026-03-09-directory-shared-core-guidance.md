## Context

`dadeto-izr6` asked for one short repo-guidance note that makes the `directory-shared-core` experiment usable during normal coding loops.

## What changed

I added two concise bullets to [AGENTS.md](/home/matt/dadeto/AGENTS.md) under coding expectations:

- prefer one primary shared module per directory, named after the directory, as the default home for new cross-file helpers
- treat that as guidance rather than a hard law, and treat an incoherent shared module as evidence to split the directory or keep a narrower concept file instead of flattening everything into one shared core

## Why this spot

The repo router is the right surface for a short operational convention. The project note in `projects/directory-shared-core/notes.md` still holds the longer experiment framing, while `AGENTS.md` now gives future coding agents the fast default they need during implementation loops.
