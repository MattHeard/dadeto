# Reusing normalizeString in get-moderation-variant

*Unexpected hurdle.* I expected to swap the helper by just updating the import, but `apply_patch` kept failing because the comment block around the local `normalizeString` differed slightly from the pattern I provided. Reading the surrounding lines and reissuing the patch with tighter context resolved it.

*Takeaway.* When editing long files full of JSDoc blocks, capture the exact surrounding whitespace in patches—especially when removing functions—so the diff applies cleanly.
