<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-github-workflow -->
## PERMANENT GIT / GITHUB WORKFLOW (set by Fouad, 2026-10-14)

This applies to every OpportunityHub coding session. Follow it automatically; the
user should not have to repeat it.

### Repository state (verify, do not assume — this can change)

- Remote `origin`: `https://github.com/Sachin-Lamsal/OpportunityHub.git`
- Working branch: `pathced-notes`
- Upstream: `origin/pathced-notes`
- `main` is **protected** — never push to it without explicit authorization.

Always run `git branch --show-current`, `git status`, and
`git rev-parse --abbrev-ref --symbolic-full-name @{u}` first. If the branch or
upstream differs from the above, stop and ask rather than guessing between
production and development destinations.

### 1. Before editing

- Check branch, status, upstream and remote.
- Preserve the user's existing uncommitted changes. Never discard their work.
- Never expose secrets in output or commits.

### 2. After implementing

- Run the relevant tests (`npm test`), TypeScript (`npx tsc --noEmit`) and lint (`npx eslint`).
- Run `npm run build` for meaningful application changes.
- Review the full diff for accidental changes, debug code, secrets and unrelated edits.
- Disclose clearly any test that could not run.
- **Do not push broken or unverified changes.**

### 3. Upload verified changes

1. Commit only the intended changes, with a clear descriptive message.
2. Push to the working branch and its configured upstream.
3. Verify the push succeeded and the remote points at the expected commit.
4. Report the exact repository, branch, commit hash, and files/features changed.
5. If the push is rejected, explain the real reason and resolve it safely if possible.

### 4. Safety rules (absolute)

- Never push to `main` or any production branch without explicit authorization.
- Never force-push, rewrite **published** history, delete branches, or change
  GitHub repository settings without explicit approval.
- Never commit `.env` files, API keys, passwords, or service-role keys.
- On discovering an exposed credential: **stop**, do not publish it, and explain
  the rotation and cleanup steps.
- Never deploy to production unless separately authorized. **A GitHub push is
  not a deployment** — never report one as the other.
- If tests fail, preserve changes locally and explain; do not push a broken result.
- If auth, permissions, network, or GitHub push protection block a safe push,
  state exactly what the user must do.
- If unrelated changes exist, commit only the task's files; never silently sweep
  in the user's other work.

### 5. Required final response format

Every task must close with:

- What changed.
- Which tests passed and failed.
- Whether a commit was created.
- Whether the push succeeded.
- Exact repository, branch and commit hash.
- Whether the live site was deployed (normally: no).
<!-- END:git-github-workflow -->