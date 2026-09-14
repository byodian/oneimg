# Issue delivery status

Last reconciled: 2026-09-14. Repository: https://github.com/byodian/oneimg. Review baseline for this implementation run: `84178f7`. The current branch is `main`; existing local work began 28 commits ahead of `origin/main`. Source changes have not been pushed by this run.

GitHub acceptance criteria and `Blocked by` dependencies remain authoritative. This file records evidence and the next delivery order; it is not a substitute for rereading issue comments before starting a slice.

## Current reconciliation

| Issue | Evidence and disposition |
| --- | --- |
| #27–#29, #31–#39 | Closed on GitHub; implementation exists in local history and the existing scenario corpus. Do not reimplement these slices. Follow-up coverage remains tracked in #58–#67. |
| #30 | Earliest open slice. Local Adapter foundation committed as `91cbafc` with request/resource filtering, authorization boundary, idempotent local starts, cancellation, owned final bytes and cleanup retry. Real remote renderer/capability/quota/deletion evidence remains missing; keep OPEN. See [foundation and remaining evidence](./high-fidelity-adapter-slice.md). |
| #40 | Local Social Share Set implementation verified: previewable format copies, current-page copy/download/share, real JPEG/WebP proof bytes, ordered ZIP, metadata removal, automatic pagination and cross-page transactions. See [slice contract and evidence](./social-share-slice.md); final remote disposition is recorded on the issue after committing. Prerequisites #37 and #39 are closed. |
| #41 | Implementation already exists in `831423f`, with database compatibility fix `d3fedb9`. Code and Package/Studio scenarios verified; closed remotely on 2026-09-13 with an explicit note that source is still local and #60 remains open. |
| #42–#43 | Next eligible local work: #42 Legacy ContentDB migration, then #43 longpic import. #41 is closed. Preserve original sources, use idempotent checkpoints and activate only after complete destination validation. |

## Subsequent slice order

After the above eligible work, continue #44 Internal Notice → #45 Faithful PDF → #46 Travel Guide → #47 Sensitive Resume → #48 Style Preset → #49 Platform HTML. Honor each issue's declared prerequisite list when selecting the next slice.

Managed export #50 → #51 → #52 remains dependent on #30's actual service evidence. AI proposal work #53 → #54 follows the declared local Scene prerequisites. Beta/default/legacy contraction #55 → #56 → #57 requires the published release gates, migration evidence, user-task validation, support window and explicit rollout/rollback decisions; writing code alone cannot prove those gates.

Follow-up issues #58–#67 cover deferred conformance/performance/recovery matrices. They remain open until the actual requested matrix and representative-device evidence is available; a narrow passing scenario is insufficient to close them.

## Earlier user feedback

- #2: Markdown API; not implemented by the existing Smart Paste UI.
- #9: user-uploaded template backgrounds; still a separate feature request.
- #20–#21: automatic slicing and Markdown/platform output overlap with #33/#37/#40/#49; verify the requested platform behavior before closing.
- #22: Markdown tables overlap with #33; verify the original copy/paste journey before reconciling its state.
- #23: font loading; local Canonical Font resources exist for Studio, but the legacy route must also be checked against the user's report.
- #24: amd64 container images; inspect the release workflow and published manifest before treating it as delivered.
- #8: appreciation/discussion, not an unimplemented feature.

## Handoff discipline

For each slice, record the exact commit, public behavioral evidence, remaining acceptance gaps and remote comment/state update. Keep local completion distinct from published source and deployed product availability. Do not close the parent spec #26 while any of its required slices or release gates remain incomplete.

## Verified milestone — 91cbafc

- `pnpm exec playwright test tests/scenarios/high-fidelity.spec.ts --workers=1`: 16 passed.
- `pnpm exec playwright test --workers=1`: 89 passed (1.8 minutes), including existing Package, recovery, media and WYSIWYG scenarios.
- `pnpm typecheck`, `pnpm lint`, `pnpm build`, and diff whitespace checks passed.
- Independent Standards and Spec reviews found output-dimension validation, branch-coverage and provider-result ownership gaps; regression tests and fixes landed, and both follow-up reviews found no unresolved substantive issue within the documented foundation.
- #30 progress comment posted, issue remains OPEN; #41 completion comment posted and issue CLOSED. No source push or deployment performed.


## Verified milestone — Social Share Set (#40)

Review baseline: 4769626; verified 2026-09-14.

- Full Playwright suite: 109 passed (2.4 minutes), including 20 Social Share scenarios and all existing renderer, export, asset, Package, persistence and Studio recovery scenarios.
- Typecheck, lint, production build and diff whitespace checks passed.
- Standards review initially found CSS ownership and focus/assistive announcement gaps. The root scoping and stable Studio-owned feedback/announcement lifecycle were fixed; regression coverage includes unique-resource page transitions and DOM-node continuity. Follow-up review passed.
- Spec review initially found current-Page propagation, initial-format consistency, empty-Page classification, filename policy and first-image page-break gaps. All five were fixed and the follow-up review passed.
- The output matrix verifies exact 1:1, 4:5 and 9:16 dimensions; preview/PNG visual agreement; actual JPEG/WebP byte reuse; ordered Bundle entries; source orientation and metadata normalization; current-Page sharing and download fallback; cancellation; and durable cross-page edits.
- Browser API doubles verify the Clipboard/Web Share boundary without changing the host clipboard or opening its share sheet. Representative device/browser and stress matrices remain in #59/#63/#64/#66/#67; this slice does not close them.
- Source is local on main. No push or deployment was performed. Remote issue disposition is updated after the implementation commit is created.
