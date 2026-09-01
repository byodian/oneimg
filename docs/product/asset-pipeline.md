# OneIMG Asset Pipeline

The Asset Pipeline keeps large local media responsive without creating a second visual interpretation for export. It owns ingestion, normalization, reusable derivation, local resolution, format conversion, recovery, and decoded-memory policy behind one Module Interface.

## Asset representations

An Asset has three distinct representations:

- Asset Original is the immutable user-provided byte sequence retained locally by default for recovery and OneIMG Package portability.
- Render Source is a high-quality normalized visual representation with fixed orientation, color interpretation, intrinsic dimensions, alpha treatment, and coordinate space.
- Asset Derivative is a disposable thumbnail, screen-sized preview, or processing representation produced from the Render Source and rebuildable without changing Document content.

The Document references an Asset identifier rather than a Base64 string, Blob URL, filesystem path, or derivative key. Identical Asset Original bytes may share storage through a local content digest, while Media Items retain independent semantic identities and crop intent. Raw content digests are not remotely exposed as identifiers or telemetry.

## Module Interface

The external Asset Pipeline Interface accepts local inputs for ingestion, resolves an Asset identifier against a declared rendering requirement, and relinks an Unresolved Asset. It returns bounded Blob handles, normalized metadata, readiness, or stable recovery findings. Callers do not choose decoders, manipulate caches, correct EXIF orientation, create object URLs, schedule Workers, or know where bytes are stored.

Format decoding and conversion are internal seams. Ordinary browser decoding and a local HEIC/HEIF conversion Adapter may satisfy the same normalized result contract when both are available. AVIF remains capability-gated, animated GIF resolves its disclosed first frame, and SVG must be sanitized or rasterized before it can become a photo-like Render Source.

## Ingestion

Ingestion reads enough bounded metadata to preserve source order and establish placeholders quickly, then performs content hashing, decoding, orientation normalization, color handling, and derivative creation off the main interaction path where supported. JPEG, PNG, and WebP are required inputs. Asset Original bytes remain unchanged even when the Render Source normalizes orientation or format.

A multi-file input is one import operation. Every input keeps its original ordinal. A valid input creates or reuses an Asset and Media Item; a missing, corrupt, unsupported, or failed-conversion input creates an Unresolved Asset at the same ordinal with a stable reason and recovery actions. The resulting successful and unresolved entries commit together as one Edit Transaction and may be undone together.

Cancel stops work not yet required by a committed result. The UI offers to undo the batch or retain the completed portion; unreferenced temporary bytes and derivatives are cleaned without touching shared Asset Originals.

## Normalized coordinates and WYSIWYG

Focal Point, zoom intent, fit, and 90-degree rotation correction are interpreted in the Render Source coordinate space. Preview and every Rasterizer Adapter resolve that same orientation, dimensions, color interpretation, alpha treatment, and media content. A higher Output Scale may reveal more source detail, but it cannot alter crop, composition, or color handling.

Asset Derivatives may reduce decoded dimensions for screen use only when they preserve the Render Source's aspect ratio, orientation, color treatment, and focal coordinates. They never become a different crop or substitute different image content. Clean Preview and Export Snapshot creation wait for an appropriate resolved source for every target Page.

## Progressive readiness

The editor may first display a fixed-geometry skeleton from trusted metadata and then a progressive Asset Derivative. Those states are visibly preparing and are not Canonical Preview or Render Ready. Replacing them with the ready representation cannot change intrinsic geometry, Page layout, crop, color interpretation, or semantic order.

Render Ready is evaluated for the Pages needed by the current operation rather than requiring every offscreen Page to remain decoded. Export waits for all Pages in its Export Snapshot. An Unresolved Asset prevents Render Ready and blocks Raster Export until the user relinks it or explicitly removes its Media Item through an Edit Transaction.

## Scheduling and memory

Visible Pages, adjacent Pages, selected media, and active export work receive ordered decode priority. Concurrent decodes and total decoded pixels obey a device-informed memory budget. Far-offscreen decoded results and disposable object handles are released while immutable stored sources remain available.

The application shell may virtualize distant Page interaction surfaces, but the Canonical Renderer still computes the declared Document structure and Page layout. Thumbnail generation, normalization, and encoding use Workers and available off-main-thread image capabilities when their Adapters are certified; a fallback may be slower but cannot produce different orientation, crop, color, or layout.

The Pipeline stores and transfers Blobs rather than Base64. Derivatives use bounded least-recently-used storage and can be discarded under pressure. Asset Originals referenced by Documents, retained history, Trash, or OneIMG Packages being assembled are not evicted as cache entries.

## Recovery

An Unresolved Asset preserves its owning Media Item or other semantic reference, Caption, Alternative Text, order, Featured state, Focal Point, zoom, and fit. The editor offers relink, re-import, or explicit removal and may rank local candidates using the original digest, filename, media type, dimensions, and byte size. It never silently binds a candidate or falls back to a remote hotlink.

Relinking replaces the unavailable byte source while retaining semantic placement. If the dimensions or orientation differ, the Canonical Preview visibly recomputes the framing and becomes Render Ready before export. Removing the item is an ordinary reversible Document change, not an export-time omission.

## Slice 12 implementation

Issue #38 adds the first browser Asset Pipeline vertical slice. `BrowserAssetPipeline` content-addresses JPEG, PNG, and WebP input, keeps a private immutable copy of the Asset Original, and creates a full-resolution PNG Render Source after decoding. JPEG EXIF segments are removed from the decode copy before orientation is applied, so EXIF correction occurs exactly once; the Original remains unchanged. The resulting metadata records raw and normalized dimensions, top-left orientation, sRGB interpretation, and alpha treatment.

Studio imports preserve file order in one Media Group and commit a multi-file selection as one Document transaction. The Document contains only Asset references and Media Item intent—Focal Point, zoom, fit, rotation, Featured state, Caption, and Alternative Text. The Canonical Renderer and the local SVG export adapter both resolve the same Render Source definition, so export does not read the original file or a preview-only Blob URL. A transient image adjustment can be canceled or committed as one transaction, and Escape cancels it without touching history.

An invalid or missing source remains an Unresolved Asset in its Media Item position. Preflight exposes a relink action and blocks local export until every referenced item resolves; it never drops the item or promotes its filename to visible Caption. Asset Originals and the Render Sources needed to rehydrate committed Documents are persisted in the Local Repository; disposable Derivatives remain session-scoped. OneIMG Package imports additionally retain their committed Original and any declared Render Source through the same atomic Document commit, so a restored Draft can rehydrate the same asset representations.

## Privacy and output metadata

Asset Originals, Render Sources, derivatives, filenames, metadata, and local content digests stay on device unless a specific remote operation is authorized. High-Fidelity Export transfers only the Render Sources and semantic metadata referenced by its minimal Export Snapshot, using opaque Job identifiers.

Raster outputs contain the rendered pixels and only required standard color or format metadata. EXIF, GPS, original filenames, local paths, content digests, thumbnails, and unrelated Asset metadata are omitted. OneIMG Packages include referenced Asset Originals for portability and include a Render Source only when the minimum supported reader cannot deterministically reconstruct that exact normalized representation; disposable Asset Derivatives remain excluded.

## Acceptance

- Five ordinary local images establish stable layout placeholders within 300 milliseconds and a usable progressive preview within 1.5 seconds on the reference device.
- Loading a ready source never shifts Block geometry or changes crop.
- Opening a long Document does not eagerly decode every Asset at full resolution.
- Canceling ingestion stops pending heavy work and leaves no committed orphan reference.
- A partial import preserves every original ordinal through resolved or unresolved entries.
- Preview and Raster Export fixtures agree on orientation, focal crop, color treatment, alpha, and image identity across every supported input path.
