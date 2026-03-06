# Retrospective: README architecture refresh

I expected the root README to describe only the static blog generator, but the repository now spans multiple products (mattheard.net, Dendrite cloud workflows, and a local writer app). The surprise was that the architecture boundary was clearer in scripts and directory layout than in top-level docs.

To reconcile that, I mapped environment responsibilities from `package.json` scripts and build copy entry points (`src/build/copy*.js`) before rewriting the README. That helped avoid documenting an outdated “single generator” model.

If I do this again, I would start by deriving docs from three anchors first: (1) npm scripts, (2) top-level source folders, and (3) deployment workflows. That triangulation gave a reliable picture of what is actually shipped.

Open follow-up idea: add a short architecture decision record that formalizes the core-vs-environment adapter rule so boundary drift is easier to catch during reviews.
