# Practical Scenes and Output

This specification closes the detailed Scene and output decisions accepted in design rounds R22 and R23. Scenes remain guidance over the common Document model, while output formats remain consumers of one Canonical composition.

## General Long Image

General Long Image supports heading hierarchy, Rich Text, lists, quotations, deterministic code presentation, Sections, dividers, media, captions, Callouts, Key Value facts, and an optional generated table of contents. The table of contents derives from headings and does not duplicate manually maintained structure.

Continuous output prefers Section, heading, and Keep Together boundaries when creating Semantic Slices. Pixel boundaries are a safety fallback, not the primary meaning model. The initial default remains Clear Reading with a complete Local Certified presentation.

## Social Smart Collage

Smart Collage preserves source order, treats the first photo as the initial Featured candidate, and chooses an initial arrangement from image count and aspect-ratio evidence. It never mutates Asset Originals. Focal Point, zoom intent, fit, and rotation correction remain non-destructive Media Item properties.

Text appears only in protected Template regions such as title, context, date, location, Caption, and closing bands. Arbitrary positioned text, stickers, layers, filters, and uncontrolled rotation remain outside the product.

“拼成一张” creates one composed Page. “成组分享” creates an ordered Social Share Set in a consistent Page Format, with stable sequence, individual download, and one ordered Export Bundle.

## Resume

Resume starts as a Sensitive Document because it commonly contains contact and employment data. The user may explicitly remove that designation, but any later remote operation still follows its own authorization contract.

Resume supports structured identity, summary, Timeline experience and education, projects, skills, awards, links, and contact facts through shared Blocks and Repeating Entries. It does not claim ATS compatibility for Raster Export. Structure is preserved so a future semantic PDF or DOCX Adapter can be evaluated without changing the Document model.

A4 Page boundaries are visible. One-Page fit is guidance, not a requirement; overflow produces additional Pages and may suggest compact Density without silently applying it.

## Travel Guide

Travel Guide supports days and Sections, Timeline itinerary, destinations, transport notes, budget Data Tables, Key Value facts, Checklists, links, QR Codes, and Media Groups. Initial creation does not depend on live maps, weather, booking accounts, or ambient network data. A future connected feature must be explicit and keep fetched facts separate from authored content.

## Internal Notice

Internal Notice supports issuer, audience, date, time, location, contact, body, agenda or Timeline, Checklist, Callout, links, Logo, and QR Code through common Blocks. The Scene suggests Sensitive mode when internal audiences, meeting links, or contact details are detected, but it does not silently change the designation.

Templates never manufacture seals, stamps, signatures, official letterhead, or authority. A4 Print Notice is ordinary sRGB office-print output rather than a professional legal or print-production claim.

## QR Code

QRCode is a deterministic Block for URLs, text, and supported contact payloads. The editor validates payload length, quiet zone, contrast, and minimum rendered size before export. Non-HTTPS and suspicious-looking links receive a warning without silently changing the value. The Export Snapshot freezes the resolved payload.

## Scene switching and admission

Changing Scene preserves every Block. Blocks that do not map into destination Slots become Unmapped Content and remain visible and recoverable in a Conversion Draft. No Scene switch deletes authored data.

A new Scene is admitted only when it can be expressed through the shared Block Catalog, Scene Slots, Template primitives, and output contracts. A new common capability must demonstrate reuse by at least two practical Scenes before becoming a new Block or layout primitive.

After the initial five Scenes, the preferred discovery order is Event Invitation, Work Summary or Weekly Report, and Knowledge or Tutorial Card. Product descriptions, menus, price lists, and reading notes remain candidates chosen from observed use rather than a promise to ship every specialized editor.

## Delivery order

The first end-to-end product slice is General Long Image. Social Smart Collage follows immediately because media composition is a primary use case and exercises a different part of the common model. Internal Notice, Travel Guide, and Resume follow in that order; all five are represented in fixtures and schema design from the start.

Each Scene opens with an editable, realistic starter rather than a blank artboard or forced setup flow. A complete fictional example remains an explicit action that creates a clearly labeled example Draft.

## Output matrix

| Output | Initial behavior | Fidelity contract |
| --- | --- | --- |
| PNG | Default for text and mixed content | Strict Raster Export WYSIWYG |
| JPEG | Default option for photo-dominant output | Same composition with disclosed lossy artifacts |
| WebP | Capability-gated advanced option | Same composition with decoded-byte preview when quality is changed |
| Faithful PDF | One canonical raster Page per PDF Page | Same Page composition as Canonical Preview |
| Copy Image | Current Page as PNG | Reuses the Page result when possible |
| Export Bundle | Ordered Pages or Semantic Slices | Derives from the same Page composition |
| Platform HTML | Separate target-platform Adapter | Content-preserving, documented visual degradation |

## Faithful PDF

The initial PDF is a Faithful PDF intended for resumes, notices, guides, and ordinary printing. It does not invoke a second layout engine. Page dimensions come from the Export Plan and each PDF Page embeds the corresponding canonical Page artifact. It therefore preserves the Raster WYSIWYG Contract but does not claim selectable text, document accessibility, ATS suitability, CMYK, bleed, or professional print production.

A future semantic PDF is a separate Adapter with its own accessibility and degradation contract. It cannot silently replace Faithful PDF or claim identical typography without certification.

## Sharing and copying

Copy Image targets the current Page and identifies its sequence in multi-Page Documents. All Pages are obtained through ordered download, Export Bundle, or capability-gated system Web Share. OneIMG does not promise direct posting to a particular social account or platform.

Lossy quality controls display a decoded preview of the actual encoded current Page and its estimated byte size. Formal export uses the same encoder revision and options. Option changes do not eagerly rerender unaffected Pages.

## Metadata and filenames

Raster output strips EXIF, GPS, device, and other unnecessary source metadata after orientation has been normalized into the Render Source. Output contains only metadata required for declared format and color behavior.

Filenames use a cleaned short Document name, date, and stable Page or Slice sequence. Sensitive Documents default to a neutral filename and allow explicit rename. File extensions always match encoded bytes.

## Explicit output boundaries

The initial product does not offer general SVG download because internal foreign-object SVG is not a portable design format. It does not promise CMYK, bleed, professional print production, DOCX, ATS output, or editable platform HTML with Raster-level WYSIWYG. It adds no OneIMG watermark to exported work.
