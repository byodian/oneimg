# OneIMG Export Engine

The Export Engine is the single deep Module responsible for turning a Document into Raster Exports, Semantic Slices, copied images, and Export Bundles while enforcing the WYSIWYG Contract. Callers do not choose a Rasterizer Adapter or orchestrate fonts, rendering, encoding, caching, retry, or packaging themselves.

## Interface

The conceptual Interface remains small:

```text
plan(request) -> Export Plan
run(plan) -> Export Job
cancel(jobId)
```

An Export Plan records the selected route and reason, authorization requirement, Pages or Slices, output format and scale, findings, and cache reuse. An Export Job exposes stages, progress counts, result, cancellation, and stable failure information.

Opening the export panel calls `plan()` and performs no Page rasterization. `run()` begins only after an explicit export action. Proof Preview and lossy compression preview are the only option-review paths that require actual encoded bytes.

The internal Rasterizer seam has a Local Adapter, an owned High-Fidelity Adapter, and an in-memory Adapter for tests. Editor and Scene code never branches on those implementations.

## Service boundary

Local editing and Local Export remain anonymous, offline-capable, and independent of any hosted account. High-Fidelity Export is an optional managed capability behind a provider-neutral High-Fidelity Adapter; self-hosted installations may configure another conforming Adapter without changing editor, Scene, or Document code.

The initial hosted deployment separates responsibilities:

- the existing App Worker owns the web application, export planning entry point, authorization UI, and authenticated API;
- a dedicated Export Service Worker owns the High-Fidelity Adapter and can advance its runtime compatibility independently of the App Worker;
- one durable Workflow instance orchestrates each remote Export Job;
- one `ExportJob` Durable Object is the coordination atom for user-visible state, monotonic transitions, cancellation, browser-session ownership, and cleanup alarms;
- private R2 objects contain the ephemeral input and output bytes, while Workflow and Durable Object state remain content-free; and
- Cloudflare Browser Run is the first managed Adapter, with a pinned Chromium container retained as a future reference and strict-reproducibility Adapter.

The first version does not add a Queue between these components. Workflow execution already supplies durable steps, retries, waiting, termination, and rollback. A Queue may be introduced behind the same Module only when measured multi-provider priority or backpressure needs justify an additional at-least-once delivery boundary.

## Immutable snapshots

Starting an export creates an immutable Export Snapshot containing the selected Document, Pages, Blocks, referenced Render Sources, Template, Theme, Density, Page Format, Reference Viewport, resolved locale and direction, Canonical Font identifiers, output options, and relevant model and renderer versions. Asset Originals and unrelated derivatives are excluded. Editing may continue while the Job runs but cannot alter its result; the interface identifies when a completed result predates current content and offers a new export.

## Route planning

Planning considers Template Capability, Block and CSS requirements, browser support, font and Asset readiness, estimated pixel and memory cost, network availability, the Sensitive Document designation, user privacy preference, authorization state, and managed-service entitlement. It returns one of:

- **Local Eligible** — Local Export can satisfy its declared fidelity contract.
- **High-Fidelity Recommended** — Local remains valid but the canonical remote path is more reliable for this output.
- **High-Fidelity Required** — required presentation is outside the Local capability profile.
- **Cannot Export** — neither route can produce valid output from the current snapshot.

An always-local preference never permits silent visual corruption. Every eligible route must satisfy the WYSIWYG Contract for the exact Snapshot; capability differences decide whether a route is available, not whether visible differences are acceptable. A High-Fidelity Required plan instead offers a compatible Template, removal of the incompatible effect, or explicit Remote Export Authorization. A Sensitive Document can never select the remote route; when Local is ineligible, its plan explains the incompatibility and offers only local repairs.

## Local Adapter

The Local Adapter instantiates the same versioned Canonical Renderer used by the editing surface in an isolated Canonical Render Root at the identical Reference Viewport. It resolves the same local Render Sources, fonts, and Template assets through the Resource Resolver, waits for the full Render Ready contract, freezes Snapshot-owned dynamic values, and captures only Templates declared compatible with its local SVG foreign-object profile. Editor chrome is outside the root and is never removed through layout-changing clone mutations. `html2canvas` is not the canonical Rasterizer because it reconstructs only CSS it understands and therefore cannot enforce the WYSIWYG Contract for newer CSS ([documentation](https://html2canvas.hertzen.com/documentation/), [unsupported features](https://html2canvas.hertzen.com/features/)).

The Adapter serializes only the inert root and versioned scoped Style Pack to Blob-backed SVG, then uses Canvas or OffscreenCanvas for rasterization and encoding. It never scrapes global stylesheets, copies application DOM, follows arbitrary URLs, or converts large Resources to Data URLs. The complete pipeline and capability policy are recorded in [Renderer, Template Runtime, and Local Export](./renderer-template-runtime-and-local-export.md).

Normal-size Pages are captured once per Export Job. Compatible encodings, Copy Image, Semantic Slices, Export Bundles, and Faithful PDF derive from that Page result instead of mounting another renderer. Resize, crop, compression, image encoding, and ZIP packaging run outside the main thread through Worker and OffscreenCanvas capabilities where available ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob)).

## High-Fidelity Adapter

The owned remote Adapter runs the same Canonical Renderer bundle from the minimal Export Snapshot with a certified Renderer Revision, identical Reference Viewport, Canonical Fonts, and versioned Templates, then captures the full Page, element, or planned clip through browser screenshot primitives ([Playwright](https://playwright.dev/docs/next/screenshots)). A Renderer Revision includes the renderer engine, Template pack, Canonical Font pack, CSS capability profile, Adapter implementation, and observed browser version; it is promoted only after the common preview-versus-export conformance suite passes.

Cloudflare Browser Run is a managed Chromium environment rather than a permanently pinned browser binary. Its Adapter therefore records the observed provider and browser revision, treats provider releases or session eviction as recoverable infrastructure events, and quarantines a changed revision until golden exports pass. A pinned-container Adapter implements the same Interface when exact long-term reproduction or a different region is required ([Browser Run limits](https://developers.cloudflare.com/browser-run/limits/), [custom fonts](https://developers.cloudflare.com/browser-run/features/custom-fonts/)).

An already certified Renderer Revision exports directly. When an otherwise valid High-Fidelity route cannot prove that the current environment is certified, it may create a Proof Preview: the service encodes the final artifact once, the client decodes and displays those exact bytes, and acceptance downloads the same Blob without another render. Proof Preview is an exceptional recovery path, not a routine extra screen.

Only referenced content is uploaded. Task data is isolated, encrypted in transit and at rest, excluded from content logs, analytics samples, and training, and deleted according to the explicit lifecycle below. Non-content timing and error-category metrics may remain.

## Managed authorization and quota

Remote Export Authorization is requested at the first High-Fidelity Export and states what leaves the device, why it is needed, and when it is deleted. Remembering that authorization does not enable project sync or authorize remote AI. An always-local preference and the Sensitive Document designation override remembered authorization.

The launch policy allows one anonymous High-Fidelity trial protected by Turnstile, a short-lived cryptographic installation identity, and network-level abuse controls. Later managed exports require lightweight authentication and initially receive ten exports per day. Those numbers are remotely configurable operating policy, not Document schema or Adapter semantics. Local Export and a configured self-hosted Adapter are not consumed by the hosted quota.

A quota ledger reserves managed capacity atomically per authenticated principal or anonymous trial identity. Workers location-level rate limiting remains an outer abuse-control layer rather than the source of global entitlement truth ([Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)). Account-level spend alerts and a managed-service circuit breaker can disable new remote Jobs without disabling editing or Local Export.

## Remote orchestration

The durable Workflow owns infrastructure progress and retry compensation, while the per-Job Durable Object owns the product state returned by `Export Job`. Workflow parameters, step results, and Durable Object records contain only opaque identifiers, stage information, bounded counts, renderer versions, expiry timestamps, and stable error codes; snapshots, text, titles, filenames, URLs, and media bytes live only in private ephemeral objects.

Every remote step is idempotent. A stable Job key cannot reserve quota twice, create multiple active browser sessions, publish two terminal results, or revive a canceled Job. State transitions are versioned and monotonic, so a late render completion cannot replace `canceled`, `failed`, or a newer attempt.

The browser session is owned by the Job coordinator. The initial release creates a clean session per Job and never reuses one across users. A warm browser pool may be introduced only after cold-start measurements require it and fresh incognito contexts, cache and cookie clearing, cross-Job leakage tests, and explicit close handling satisfy the same isolation contract.

## Job stages

```text
analyzing
awaiting-authorization
preparing
uploading
queued
rendering
encoding
packaging
ready
```

Terminal alternatives are `canceled` and `failed`. The interface reports real stage counts such as resolved Assets, rendered Pages, or encoded Slices rather than fabricated smooth percentages. Editing remains available and every non-terminal stage except an effectively completed operation is cancellable.

The export panel initially polls at roughly 500 milliseconds and backs off toward one second for a longer Job; a short export does not require a WebSocket subsystem. Closing the panel or losing the connection does not cancel work. A short-lived, scoped Job token restores progress after reconnecting, and only an explicit cancel action stops a Job.

Cancel first commits `canceled` in the Job coordinator, then closes its active browser session, terminates the Workflow with rollback, and deletes remaining input and output objects. All actions are idempotent. A late callback observes the terminal generation and discards its output instead of publishing it.

## Ephemeral data lifecycle

Each remote Job receives a random, non-enumerable R2 prefix. Five-minute upload capabilities are scoped to one Job, object name, operation, byte limit, and content type; they do not grant listing or download access. The renderer receives separate one-time capabilities for only the objects referenced by the Snapshot.

Input snapshots and Assets are explicitly deleted as soon as rendering no longer needs them. The result remains private until the client has received the complete Blob; the client then acknowledges receipt and the service explicitly deletes it. Cancellation and terminal failure delete all bytes immediately, while an interrupted download may retain the result for no more than 15 minutes. The per-Job alarm performs the authoritative expiry sweep, and a one-day R2 lifecycle rule is defense in depth rather than the mechanism used to promise minute-level deletion ([R2 deletion](https://developers.cloudflare.com/r2/objects/delete-objects/), [object lifecycles](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)).

The user receives an Export Receipt containing transferred Asset counts and byte ranges, Renderer Revision, deletion status, and expiry time without reproducing Document content. Provider operational metadata uses the shortest practical retention and never contains raw content or remotely addressable Asset URLs.

## Remote rendering security

The service accepts the versioned declarative Document, Block, Template, and Theme model, not arbitrary executable HTML, CSS, or JavaScript. Rich Text and media metadata are sanitized again at the trust boundary. The internal render page applies a restrictive Content Security Policy and network allowlist limited to the Job's internal Asset and Canonical Font endpoints, preventing external fetches, hotlinks, and user-authored script execution.

Capabilities are unguessable, short-lived, action-scoped, and checked against Job state. The service enforces limits for Asset count, object and total bytes, decoded pixels, Page count, output dimensions, and render duration before browser allocation. Logs and metrics may include a random trace identifier, stage durations, bounded size buckets, route reason, Renderer Revision, provider close reason, and stable failure category; they never include Document names, text, user URLs, filenames, media bytes, or raw content hashes.

## Caching

The cache stores resolved Render Sources and Asset Derivatives, decoded media and fonts, Page-level intermediate rasters, and final files or Export Bundles as Blobs rather than Base64. Keys include Export Snapshot hash, Page identifier, Asset and derivative revisions, Template, Theme and font versions, Page Format, Density, Output Scale, Rasterizer and encoder versions, format, and compression options.

Changing one Bounded Page invalidates only that Page's intermediate output. Changing a Continuous Page invalidates that Page raster while retaining unchanged Assets, fonts, other Pages, and compatible final artifacts. Capacity limits and least-recently-used eviction prevent cache growth from becoming project data growth.

## Oversized output

A Page within a safe device-specific pixel budget is captured once and then partitioned. A larger Page uses Segmented Render before allocating a monolithic bitmap: Section, heading, and Block boundaries determine regions; visual background, width, typography, and ordering remain continuous; and only bounded intermediate bitmaps coexist. High-Fidelity uses browser clip screenshots while Local uses bounded render roots.

The Export Plan tells the user when a safe single image is impossible and how many outputs will be produced. The product never promises unlimited image dimensions; browser Canvas limits vary by browser, operating system, and hardware ([html2canvas FAQ](https://html2canvas.hertzen.com/faq)).

## Failure and fallback

Output semantics never change silently. A Local memory failure may retry once through Segmented Render. High-Fidelity network failure preserves the Snapshot for retry and may offer Local only when it is eligible for the same WYSIWYG result. Unsupported encoding explicitly offers PNG. An Unresolved Asset prevents Snapshot creation and navigates to its owning content with relink or explicit removal actions; it is never omitted at export time. Missing fonts use declared fallbacks only after the same fallback has become visible in the Canonical Preview with a Quality Warning. Every failure identifies a stable category, stage, and actionable next step; visible mismatch is a failed export, never a warning-only success.

When no eligible route can honor the current Canonical Preview, the user-facing outcome is “当前效果无法在此设备上无差别导出” with only valid next actions: authorize High-Fidelity Export, apply and first preview a compatible Template, replace the unsupported effect, or leave a Sensitive Document unchanged. There is no best-effort mismatch override.

## Performance acceptance

The reference fixture is a 1080 by approximately 6000 pixel PNG containing ten localized images, one Canonical Font, and standard Density. Measured targets are:

- Local cold P95 at or below 3 seconds
- Local repeated-snapshot P95 at or below 1.5 seconds
- High-Fidelity end-to-end P95 at or below 8 seconds, excluding human authorization time
- Real stage feedback within 100 milliseconds
- Heavy resource allocation stops within 500 milliseconds of cancellation
- No encoding or packaging main-thread Long Task above 50 milliseconds
- No more than 512 MB additional peak memory for the reference fixture

Large output may take longer or segment automatically but must not crash the editor or lose content. Regressions are release-blocking against a fixed benchmark machine, primary Chromium version, and declared medium-network profile.

The hosted P95 promise is made per supported region rather than inferred from the provider's global footprint. Initial acceptance measures representative mainland China networks in North, East, and South China plus an East Asia location. If Cloudflare Browser Run cannot meet the target in a region, the Adapter remains beta there and the same High-Fidelity Adapter may select a regional pinned-container implementation.

Production Browser Run requires a Workers Paid deployment; Free-plan browser time, concurrency, and instance-creation limits are suitable only for development ([limits](https://developers.cloudflare.com/browser-run/limits/), [pricing](https://developers.cloudflare.com/browser-run/pricing/)).

## Adapter conformance and release gates

Every Rasterizer Adapter runs the same corpus across all initial Scenes, Template Families, Page Formats, Display Zoom levels, multi-Page outputs, Segmented Render, and supported encoders. Each fixture captures a Clean Preview from the production Canonical Renderer, decodes the exported artifact, normalizes both to equivalent scale and color space, and compares them. Structural invariants are absolute: every expected Block, Asset, and Canonical Font is present; order, line wrapping, crop, and Page boundaries are preserved; and no content is silently clipped. Geometry is compared at the Reference Viewport with approximately one-CSS-pixel diagnostic tolerance, while text antialiasing is evaluated separately from semantic and line-layout correctness; any user-visible mismatch remains release-blocking.

The suite also injects duplicate starts and completions, cancellation races, expired tokens, interrupted uploads and downloads, provider session eviction, render retry, failed deletion, and alarm recovery. A changed Browser Run or Playwright revision is quarantined until these fixtures and the regional performance benchmark pass. Deletion failures enter a content-free cleanup audit keyed only by opaque Job identifiers, and no Adapter may bypass the common Export Engine contract to recover them.
