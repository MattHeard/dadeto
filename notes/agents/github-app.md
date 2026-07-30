# GitHub App Workflow for `dadeto`

## Identity

The repository uses the private GitHub App `vaelith-dadeto` for agent-authored
commits and pushes.

- App ID: `4438172`
- Installation ID: `150144774`
- Repository: `MattHeard/dadeto`
- Commit identity: `Vaelith Dadeto Bot <4438172+vaelith-dadeto[bot]@users.noreply.github.com>`

The private key is machine-local and must never be committed, printed, or pasted
into chat. Do not store installation tokens in Git config; they are short-lived
and should be generated only for the operation that needs them.

## Authentication pattern

When `gh` is unavailable, generate a short-lived JWT locally from the App ID and
private key, exchange it for an installation token at:

```text
POST /app/installations/150144774/access_tokens
```

Use the resulting token only for the current Git/API operation. For an HTTPS Git
push, GitHub accepts basic auth with username `x-access-token` and the installation
token as the password. Clear shell variables immediately afterward.

If the GitHub API cannot be reached from the sandbox, request a narrowly scoped
network approval for the read-only installation lookup/token exchange or push.

## Push workflow

1. Resolve the checkout and branch before acting: `git remote -v`, `git status`,
   and `git branch -avv`.
2. Inspect and validate the intended diff. Never assume multiple local checkouts
   contain the same changes.
3. Set the bot author explicitly for agent commits:

   ```bash
   git -c user.name='Vaelith Dadeto Bot' \
       -c user.email='4438172+vaelith-dadeto[bot]@users.noreply.github.com' commit
   ```

4. If fixes are split across `dadeto` and `dadeto-worktree`, commit each bounded
   change in its own checkout, then merge the worktree branch into `main` with a
   bot committer identity.
5. Push only after checking `git diff --check`, relevant tests, and the final
   `git status`. Confirm `main` is synchronized with `origin/main` afterward.

## Permissions and safety

For ordinary commits and pushes, the app needs only repository **Contents: Read
and write**, installed only on `MattHeard/dadeto`. Add pull-request or workflow
permissions only when the task explicitly requires them. Never broaden repository
selection to all repositories for convenience.

Do not use a personal PAT when the app identity is available: the app keeps
automation attributable to the bot and limits access to the selected repository.
