# Number update handler array

- **Unexpected hurdle:** The request to batch-update each handler introduced a bit of duplication risk, so I captured the DOM setter and `setInputValue` in an array to keep the order the same without rewriting the call sites.
- **Diagnosis & options considered:** Rather than inline multiple statements in `createUpdateTextInputValue`, creating `updateHandlers` keeps the loop centralized and makes it easier to extend if more updates are needed later.
- **What I learned:** Arrays of callbacks are handy for sequencing side effects when you want to keep the calling code concise; just make sure each function accepts the same arguments to avoid surprises.
- **Follow-ups/open questions:** No follow-ups—everything stays deterministic and lint continues to pass.
