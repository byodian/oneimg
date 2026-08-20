# Trust, Localization, Accessibility, and Security

This specification closes design round R25. These requirements apply to the local editor, every Scene, OneIMG Packages, Local Export, managed services, and future connected capabilities.

## Interface and Document locale

The initial application interface is Simplified Chinese with a complete localization boundary rather than embedded UI strings. Interface locale and Document Locale are independent. A Document records its language, direction, line-breaking policy, and formatting locale so opening it under a different interface language does not change Canonical composition.

The model accepts left-to-right and right-to-left direction, but initial rendering certification covers Chinese and English horizontal text. An RTL locale becomes a supported output only after its Templates, editing interactions, fonts, bidi behavior, and Rasterizer Adapters pass the common fixture corpus.

## CJK and glyph determinism

Canonical Renderer owns locale-sensitive line breaking, punctuation prohibition rules, spacing, and vertical metric choices. These rules are versioned with the Renderer Revision rather than delegated to an application's ambient locale.

Certified output cannot rely on uncontrolled operating-system Emoji or font synthesis. Emoji and special glyphs use a versioned supported font or a visible declared fallback shared by preview and export. A font or glyph substitution is a layout-affecting state change and must become visible before Render Ready.

## Editor accessibility

The editor targets WCAG 2.2 AA. Creating, pasting, selecting, inserting, editing, reordering, cropping, changing arrangements, reviewing findings, exporting, canceling, restoring, and importing must all have keyboard and assistive-technology paths equivalent to pointer and touch operations.

Selection, status, drag destinations, readiness, errors, and focus cannot depend on color, motion, hover, or icon shape alone. Reduced-motion preference removes nonessential spatial animation outside the Canonical Render Root. Focus indicators and assistive announcements remain editor chrome and cannot affect canonical layout.

Raster images and Faithful PDF are not represented as accessible semantic documents. Alternative Text remains part of the Document for editor assistance and future semantic outputs. Platform HTML and future semantic PDF require their own accessibility acceptance criteria.

## Content readability

Built-in Templates enforce their certified readable-size, contrast, text-backing, and overflow requirements. User-selected brand values receive immediate contrast status and a one-click compatible proposal. Ordinary choices are not silently altered, while an unreadable combination cannot be presented as a certified built-in result.

## Sensitive Document defaults

Resume begins as Sensitive. Internal Notice suggests Sensitive mode when internal audiences, contacts, meeting links, or similar evidence appears. The designation remains local data-flow policy rather than an encryption claim. Removing it is explicit, and every later remote capability still enforces its own purpose-specific authorization.

## Content-free observability

Allowed product analytics are limited to feature category, Scene identifier, output route, bounded size and duration buckets, compatibility result, anonymous performance measurement, and stable error code. Telemetry cannot contain:

- Document names, visible titles, text, prompts, or AI responses;
- filenames, user URLs, QR payloads, clipboard contents, or imported source names;
- Canonical DOM, screenshots, previews, media bytes, Asset identifiers, or content hashes; or
- credentials, signed capabilities, local storage keys, or remotely addressable Resource URLs.

Crash reporting uses a whitelist serializer. It never automatically attaches DOM, Redux/Zustand state, Document Snapshot, IndexedDB records, Package data, Resource URLs, console payloads, or network bodies.

## External resources

Canonical Documents do not retain hotlinked remote images or fonts. A user explicitly imports media into the Asset Pipeline, after which preview and export use a stable Resource identifier and owned bytes.

A future server-side fetcher must be a separate user action with URL normalization, protocol allowlisting, DNS and redirect checks, private-network denial, response and decoded-pixel limits, content-type sniffing, timeout, and malware/active-content handling. Remote content never receives ambient application cookies.

QR Code preserves the user's payload but warns about unsafe scheme, suspicious host presentation, unreadable size, or poor contrast. The application does not follow a generated QR destination as part of rendering.

## Permission timing

Clipboard read or write, system sharing, persistent storage, camera, and other device permissions are requested only after the user invokes the corresponding action. A denial keeps a manual paste, download, file picker, or other non-permission fallback where the platform allows it. The opening experience does not present speculative permission prompts.

## Browser and package security

Imported Rich Text, HTML, SVG, Templates, OneIMG Packages, legacy files, and remote Export Snapshots are inert declarative data. The application applies schema validation, sanitization, path normalization, MIME verification, decoded-pixel limits, archive entry and expansion limits, and Resource ownership checks before rendering.

The application and remote renderer use restrictive Content Security Policy and Trusted Types where supported. User-authored code, package scripts, unrestricted CSS, absolute file paths, cross-origin credentials, and ambient network requests never execute in a Canonical Render Root.

## Release security gate

Public beta requires a documented threat model covering editor injection, Rich Text, SVG, QR payloads, Asset decoding, OneIMG Package traversal and decompression, remote snapshot authorization, SSRF, capability leakage, cross-Job data isolation, logs, cleanup, and dependency supply chain.

Release-blocking tests include sanitizer bypass fixtures, hostile archive fuzzing, large decoded images, malformed fonts and media, canceled or expired remote capabilities, cross-user browser-session leakage, and content-scrubbing assertions for analytics and crash reports.
