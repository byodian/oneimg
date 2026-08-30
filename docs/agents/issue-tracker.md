# Issue Tracker Workflow

Use this workflow for issue-driven implementation in OneIMG. GitHub issues coordinate delivery; the product specifications and ADRs define the behavior that the code must preserve.

## Source of truth and implementation order

Use these sources in this order:

1. The issue's acceptance criteria define the observable result.
2. The issue's `Blocked by` entries define prerequisites.
3. The linked product documents and ADRs define domain terms, boundaries, and compatibility rules.
4. Existing code, scenario tests, commits, and local documentation show what this checkout already delivers.

Issues use titles such as `[Slice 07/31]`. Select the earliest eligible slice after its prerequisites, rather than the newest or highest-numbered open issue. A remote issue can remain open after its implementation is already present locally, so reconcile GitHub state with local commits and tests before reimplementing a slice. Record any discrepancy in the handoff.

## Start an issue task

### 1. Establish the local state

Run:

```bash
git remote -v
git status --short --branch
git log -8 --oneline --decorate
```

Completion criterion: the repository, current branch, existing user changes, and fixed-point commit are known before any file is edited.

### 2. Inspect the remote backlog

Confirm the repository from `git remote -v`, then use the GitHub CLI in read-only mode:

```bash
gh issue list --state open --limit 50 --json number,title,state,labels
gh issue view <number> --json number,title,body,state,labels,comments
```

Read the parent issue, every `Blocked by` issue, and the candidate issue's comments. Use the slice number and dependency state to choose the next eligible issue. If a blocker is remote-OPEN but its implementation is present in the checkout, verify the local evidence and report the metadata discrepancy before proceeding.

Completion criterion: one issue is selected, its acceptance criteria are copied into the working plan, and each prerequisite is either satisfied remotely or supported by verified local evidence.

### 3. Read the linked design material

Open the product and ADR links named by the issue. Also check `CONTEXT.md`, the relevant module documentation, and the implementation roadmap when the issue changes a schema or an architectural boundary. Use the repository's terms for Documents, Blocks, Scenes, Revisions, transactions, and adapters.

Completion criterion: the intended behavior, persistence/versioning impact, security boundary, and explicitly deferred work are understood well enough to state the scope in one paragraph.

### 4. Choose the behavioral seam

Express the acceptance criteria through a public scenario seam. For Studio work, the Studio Scenario Harness and production Canonical Renderer are the primary seam. For a lower-level contract, use the smallest public module interface that proves the behavior without asserting private implementation details.

Completion criterion: every acceptance criterion maps to at least one observable scenario or to a documented reason it is outside the current slice.

## Implement the slice

- Start with a failing behavior test when the seam is available, then move through red-green-refactor one vertical slice at a time.
- Keep authored content authoritative in Document Core. UI state, editor adapters, repositories, renderers, and export adapters consume or commit through the declared interfaces; they do not create competing content truth.
- Preserve semantic transaction boundaries. One user intention should produce one semantic commit, one durable result, and one undo/redo step where the issue requires it.
- Treat pasted or imported data as untrusted input. Validate it at the boundary, retain only supported meaning, and keep executable or decorative source material out of the Document and Canonical CSS.
- Version schema, renderer, style-pack, template, and migration changes together with their compatibility tests. Existing persisted data and fixtures must have an explicit read, upgrade, or rejection path.
- Keep the change within the selected issue. Put later-slice ideas in the issue handoff or product documentation rather than silently expanding the implementation.
- Update the closest product slice document when the delivered behavior or deliberate scope changes.

Completion criterion: the implementation satisfies the issue's acceptance criteria through public behavior, has a test for each important branch, and leaves no undocumented compatibility or scope decision.

## Remote issue and Git discipline

GitHub reads are part of normal issue discovery. Issue comments, labels, closing/reopening issues, pushing branches, and deployment are external state changes; perform them only when the user explicitly requests them.

Before staging, inspect the worktree again and stage only files belonging to the slice. Preserve unrelated user changes. Keep implementation reviewable through small vertical commits whose messages include the issue number when appropriate.

Record the pre-change commit as the review fixed point. Before handoff, run the repository's code review workflow against that fixed point, covering both:

- Standards: architecture, type safety, accessibility, security, persistence, and test quality.
- Spec: every acceptance criterion and every documented boundary of the issue.

Resolve actionable findings or record a concrete rationale for deferred findings. A missing issue-tracker convention file is itself a documentation gap; add or update this file rather than inventing a private workflow in a task response.

## Verification and handoff

Run the checks that match the change, including the full suite before final handoff:

```bash
pnpm typecheck
pnpm lint
pnpm exec playwright test --workers=1
pnpm build
git diff --check
git status --short --branch
```

Completion criterion: required checks pass, the final worktree state is understood, and the handoff states the issue selected, implemented behavior, deferred scope, verification results, commit(s), remote issue state, and whether anything was pushed.

Use this compact handoff shape:

```text
Issue: #<number> — <title>
Status: local implementation complete; remote state: <state>
Delivered: <observable behavior and important boundaries>
Deferred: <later-slice work, if any>
Verification: <commands and results>
Commit(s): <hash and subject>
Remote changes: <pushed/commented/closed, or explicitly not performed>
```
