# mend-group-website

Public site for MEND GROUP (PTY) LTD, served from `main` by GitHub Pages behind
Cloudflare at https://mendgroup.co.za. **A merge to `main` changes the live site.**

Hand-authored HTML/CSS/JS. No framework, no build step, no dependencies. Edit HTML directly.
`previews/` holds unlisted demo pages sent to prospects by direct link.

## Roles
- **Owner / CEO (Jakote)** approves. Nothing merges without the owner saying so.
- **Claude (CTO)** does the work: branches, edits, verifies, opens the PR, fixes review
  and CI findings, and merges only after the owner's explicit go-ahead in chat.

## The one content rule
The site may only say what the company can back today. MEND GROUP is pre-revenue with no
employees. Never add a price, lead time, response time, guarantee, location, team size,
client, statistic or certification that has not been confirmed by the owner in writing.
When a claim is removed, add nothing in its place unless the replacement is supplied.

## Never
- Add `Disallow` to `robots.txt` or any preview URL to `sitemap.xml`.
- Link to a `previews/` page from any public page.
- Delete a preview, or change any phone number, WhatsApp number or `wa.me` link.
- Remove a preview's `noindex`, its `FREE PREVIEW` bar or its "Not commissioned" line.
- Publish the company TIN.
- Put internal files at the repo root: Pages publishes them. Keep tooling under `.github/` or `.claude/`.

## Verify before every push
```bash
python3 -m http.server 8000 &
python3 .github/scripts/check_site.py http://localhost:8000
```
CI runs the same script (`Site check / claims-guard`) on every PR and against the live site
after each Pages deploy. `Claude review` is opt-in: it reviews a non-draft PR only when it
carries the `needs-review` label, using the `CLAUDE_CODE_OAUTH_TOKEN` repository secret. If a check is wrong rather than the page,
change the check in the same PR and say why in the description.

## Git
Branch from `main`, one concern per PR, squash merge. Commit messages say what changed and why.
