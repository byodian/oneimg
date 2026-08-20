# AI Assist

AI Assist is optional help for people who do not know how to structure or polish content. It is not required for creation, Smart Paste, editing, Local Export, OneIMG Packages, or any initial Scene.

## Initial scope

The initial product may offer explicitly requested rewriting, outlining, summarization, resume bullet suggestions, travel-guide structure, and Alternative Text suggestions after the local core is stable. AI image generation, OCR, automatic web research, account-connected imports, and autonomous publishing are outside the initial scope.

## Explicit invocation

Smart Paste always performs local deterministic conversion first. Pasting cannot automatically invoke AI or upload content. An AI action begins only after the user selects a named transformation and can see whether processing is local or remote.

Remote AI authorization is separate from login, High-Fidelity Export authorization, and general product terms. It identifies the selected content, purpose, provider boundary, retention behavior, and expected result. A Sensitive Document cannot use remote AI Assist in the initial product.

## Proposal contract

AI output enters a Conversion Draft rather than the active Document. The proposal shows Block-level additions, removals, moves, and textual differences. The user may accept individual changes or the complete proposal; accepted changes commit as one reversible Edit Transaction. Rejecting or closing the proposal leaves the Document unchanged.

The renderer, Scene, or export flow cannot silently accept AI output. AI responses never become Template code, executable HTML, CSS, or direct Document storage writes.

## Truthfulness boundaries

AI may reorganize or suggest wording but cannot present an unsupported inference as a user-provided fact. Missing resume history, notice authority, times, locations, prices, routes, or travel facts become questions, placeholders, or clearly labeled suggestions. The product does not manufacture professional qualifications, official authority, citations, or live travel facts.

Pasted content is treated as untrusted data rather than instructions to the AI system. A future tool-using Assist must use an allowlisted capability set and keep external findings distinguishable from authored content.

## Provider and credential boundary

The initial browser UI does not store third-party AI API keys in plaintext. A future bring-your-own-provider option requires a separate credential design and support policy. Managed AI usage has an independent quota and cost explanation from managed High-Fidelity Export; exhausting either quota never disables local creation.

## Data and telemetry

Only content selected for the requested transformation is eligible for transfer. Ordinary product telemetry and crash reports never include prompts, responses, Document text, filenames, URLs, previews, or content hashes. They may include action kind, provider category, model or policy revision, timing, bounded token range, acceptance state, and stable error code.

The Document retains only changes the user accepts. A local proposal receipt may record the action kind and model/provider revision for explanation without retaining rejected content. Remote content follows the explicit authorization and short retention contract; it is not authorized for training by the OneIMG interaction.

## Verification

Tests cover accidental invocation, Sensitive Document enforcement, partial acceptance, undo, stale proposals after continued editing, prompt injection in pasted text, malformed structured output, invented facts, provider failure, cancellation, quota separation, and content-free telemetry. AI failure cannot block manual editing or export.
