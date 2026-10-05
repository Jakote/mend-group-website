---
name: steward
description: How to drive a PR on mend-group-website from open to merged - verification, review handling, and the owner-approval merge gate.
---

# Steward: driving a PR to merge

1. **Before opening or pushing**: run `.github/scripts/check_site.py` against a local
   server (see `.claude/CLAUDE.md`). For any change to public copy, also run the
   `claims-auditor` agent on the diff. Screenshot any visual change with Playwright.
2. **Open the PR** with: what changed, why, every judgement call, the check output, and
   anything left for the owner to decide. Not a draft unless something is knowingly failing.
3. **CI red** (`Site check / claims-guard`): fix the page, or, if the check is wrong, fix
   the check in the same PR and explain it. Never delete a check to get green.
4. **Review comments** (Claude review, CodeRabbit, humans): fix blocking findings and
   plainly correct nits; reply once on anything you are not changing, with the reason.
5. **Merge gate**: the owner approves in chat ("merge", "approved", "ship it"). The owner
   opens PRs through their own GitHub account, so GitHub will not let them click Approve;
   the chat go-ahead is the approval. Merge only when ALL hold:
   - owner go-ahead given for this PR,
   - `claims-guard` green on the current head,
   - no unresolved blocking review finding,
   - no merge conflict.
   Squash merge. Never merge on a bot's say-so.
6. **After merge**: confirm the `Site check / live` run after the Pages deploy is green.
   If it is red, the live site is wrong: open a fix PR immediately and tell the owner.
