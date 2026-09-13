# High-Fidelity Adapter foundation — issue #30

## Delivery state

This is a locally verified foundation for #30, not a completed remote-rendering spike. The issue remains open. It adds no hosted endpoint, remote authorization UI, account requirement, or change to Studio's local export route.

`prepareHighFidelityRequest` captures a committed Canonical Render Snapshot and only its referenced resolved font/image Blobs. It copies and freezes the snapshot, excludes unrelated resources and resolver URLs, and strips File metadata from transferred byte views. Sensitive snapshots, unresolved Media Items, missing/ambiguous resources and invalid output scales fail before an Adapter can allocate or upload anything. Callers must pass canonical normalized Render Sources from the Resource Resolver, never raw Asset Originals.

`createHighFidelityJobRunner` is an internal composition boundary for the Export Engine. A prepared request requires explicit authorization before execution. Repeated starts of the same prepared request return the same Job and opaque Job ID, including after failure or cancellation; a deliberate new export prepares a new request. This in-process guarantee does not replace the remote service's durable idempotency or quota ledger.

The Adapter opens an isolated remote session, renders final PNG bytes, and disposes its browser and ephemeral inputs/outputs. Provider exceptions are replaced by bounded error codes. Job state exposes only an opaque identifier, lifecycle status, cleanup status and stable error code. Cancellation records a terminal state immediately, aborts transport work and requests disposal of an existing session; a late-opened session is disposed without rendering. A late render cannot publish after cancellation. Cleanup failure stays visible and can be retried without rerendering or reviving the Job.

Results are released only after confirmed cleanup and always have `fidelity: proof-required`. The runner captures provider output before disposal and checks the PNG envelope, declared dimensions, requested scaled width and bounded-page height; the eventual Proof Preview consumer must fully decode those exact bytes before offering download. This is not renderer certification or pixel conformance. The returned Blob is the same encoded artifact, so accepting a proof need not render again.

## Public verification seams

`tests/scenarios/high-fidelity.spec.ts` exercises the request factory and Job handle with a transport double at the external-service boundary. It covers resource selection, immutable snapshot capture, Sensitive/unresolved rejection, authorization, repeated starts, final-byte identity, active-render cancellation, late allocation, provider failure scrubbing cleanup retry, request/result rejection and provider-result ownership. These tests are local contract evidence only.

## Remaining issue #30 acceptance evidence

- Deploy a separate Export Service Adapter using the same schema, Renderer Bundle, Style Pack, Template, Canonical Font and Resource bytes; measure actual preview/export pixel conformance.
- Implement and verify short-lived, non-enumerable, operation/byte/MIME-limited Job capabilities and independent server-side input validation/network isolation.
- Prove durable idempotency, quota reservation, retries and terminal generations across reconnects/process restarts. The local runner cannot prove a provider never bills twice.
- Verify real browser closure, input/output deletion, expiry sweeps and failed-deletion recovery. An Adapter must compensate failures before `open` returns a session and impose bounded allocation/render deadlines, even when its caller disconnects.
- Connect a certification registry and final-byte Proof Preview to Export Engine authorization in the later managed-export slices (#50–#52). Keep Sensitive Documents local-only at both client and service boundaries.

Existing application `wrangler.toml` contains only the app Worker and assets. No separately configured Export Service/Browser Run binding or verified deployment was identified during this implementation. Local contract tests must not be cited as evidence for a real remote roundtrip.
