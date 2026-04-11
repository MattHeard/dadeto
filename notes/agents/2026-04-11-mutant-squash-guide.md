# Mutant Squash Guide

Use this pattern when a surviving mutant shows up in a core function and you want to decide whether to tighten the contract, remove dead guards, or add a test.

## 1. Start From The Real Entry Point

- Trace the mutant from the public interface down to the exact function and branch.
- Prefer the production caller over helper-only paths.
- If the branch is only reachable through a test-only override or a stale report entry, treat that as contract noise first.

## 2. Ask Whether The Type Contract Already Excludes The Value

- If the JSDoc or shared typedef says a value must be present, required, or normalized earlier, do not keep a guard clause for that value.
- Tighten the contract first so future agents read the boundary correctly.
- Then remove the redundant nullish check, type check, or fallback branch.

Good signs the contract should be tightened:

- `method?: string` where the handler always receives a real request method
- optional config fields on a factory that is always called with a full options object
- defensive checks inside a helper that is only called after earlier validation already guaranteed the shape

## 3. Keep Guards Only When The Boundary Is Truly Loose

- If the function intentionally accepts request-like or partial objects, keep the guard.
- If the guard is for an adapter or normalization layer, leave it in place and document that it is a boundary helper.
- If the guard is the only thing standing between two valid representations of the same input, it may still be worth keeping, but say why in the docs.

## 4. Prefer The Smallest Test That Proves The Behavior Difference

- Do not use a large integration test when a focused helper test can prove the branch.
- Add a test that changes behavior under the mutation, not just a test that executes the line.
- If the mutant changes a boolean or regex branch, choose inputs that clearly differ on both sides of the condition.

Examples:

- For a tokenizer mutant, test repeated separators, mixed separators, or malformed token counts.
- For a regex validator mutant, test one valid value and one invalid value that the weakened regex would wrongly accept.
- For a numeric validation mutant, test a three-part parse where the numeric fields are not integers so the downstream object would otherwise look plausible.

## 5. Distinguish Coverage From Mutation Resistance

- Branch coverage means the code ran.
- Mutation resistance means the assertions would fail if the branch changed.
- If a branch is covered but the mutant survives, that usually means the test is not asserting the behavior that branch is responsible for.

## 6. Use A Three-Step Decision Rule

When you hit a surviving mutant, decide in this order:

1. Can the boundary contract be tightened?
2. If not, is the guard clause still intentional and documented?
3. If yes, what is the smallest test that would fail under the mutation?

## 7. Record The Outcome For Future Agents

- Write a short note that names the mutant, the diagnosis, and the chosen fix.
- Include whether the change was applied, tested, and re-verified.
- If the report is stale after a refactor, say so explicitly so the next agent does not chase an obsolete survivor.

## Practical Rule Of Thumb

- Tighten types when the value should not exist at the boundary.
- Remove guard clauses when they only defend against values the contract already forbids.
- Add a precise unit test when the branch is real and the contract should remain permissive.

