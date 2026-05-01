# Notion poll blocked on first Backlog item

- **Unexpected hurdle:** The first Backlog mention on Symphony was already `Done`, so there was no eligible Dadeto task to take.
- **Diagnosis path:** Fetched the Symphony page, then fetched the first Backlog page and checked its `Project`, `Status`, and `Tags` properties.
- **Chosen fix:** Wrote a blocker note into Symphony's `# Polling notes` section with the fetch timestamp and the task status evidence.
- **Next-time guidance:** If the first Backlog mention is closed, stop early unless a separate unread message is present; do not scan deeper backlog items for this poll.
