# Issue delivery status

Last reconciled: 2026-09-13. Repository: https://github.com/byodian/oneimg. Review baseline for this implementation run: `84178f7`. The current branch is `main`; existing local work began 28 commits ahead of `origin/main`. Source changes have not been pushed by this run.

GitHub acceptance criteria and `Blocked by` dependencies remain authoritative. This file records evidence and the next delivery order; it is not a substitute for rereading issue comments before starting a slice.

## Current reconciliation

| Issue | Evidence and disposition |
| --- | --- |
| #27–#29, #31–#39 | Closed on GitHub; implementation exists in local history and the existing scenario corpus. Do not reimplement these slices. Follow-up coverage remains tracked in #58–#67. |
| #30 | Earliest open slice. Local Adapter foundation added with request/resource filtering, authorization boundary, idempotent local starts, cancellation, owned final bytes and cleanup retry. Real remote renderer/capability/quota/deletion evidence remains missing; keep OPEN. See [foundation and remaining evidence](./high-fidelity-adapter-slice.md). |
| #40 | Next unimplemented local slice: Social Share Set, previewable format conversion, current-page copy/download, capability-gated system sharing and real JPEG/WebP encoded previews. Prerequisites #37 and #39 are closed. |
| #41 | Implementation already exists in `831423f`, with database compatibility fix `d3fedb9`. Reconcile the remote OPEN state against Package/Studio scenarios rather than build it again. |
| #42–#43 | Legacy ContentDB and longpic migration follow the Package milestone; preserve original sources and activate only after validation. |

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
