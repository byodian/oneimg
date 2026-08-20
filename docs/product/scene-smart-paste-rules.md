# Scene Smart Paste Rules

All Scene mappings follow the same deterministic precedence: explicit HTML or Markdown semantics, then explicit field labels, then Active Scene rules, and finally a lossless Rich Text fallback. Source content is never discarded merely because it cannot be classified.

## General Long Image

### Mapping

- The first explicit top-level heading maps to `title`; an ordinary first sentence is never promoted merely because it comes first.
- Later major headings establish Sections.
- Paragraphs and ordinary lists remain Rich Text; only explicit checkbox syntax creates Checklist content.
- Consecutive label-value lines map to KeyValue, semantic tables map to DataTable, and adjacent images map to ordered Media Groups of no more than nine Media Items.
- Quotations remain Rich Text quotations. Only content explicitly identified as a notice, tip, important point, or conclusion maps to Callout.

### Guidance and preflight

An empty Document shows one primary prompt to type or paste content. After body content exists, the Scene does not repeatedly request optional titles, media, or tags. General Long Image adds no scene-specific Content Suggestions beyond the shared empty-document and technical checks.

## Social Smart Collage

### Mapping

- Pasted images enter a Media Group in source order. The first item becomes Featured without moving; one image uses a single-image composition, two to nine use an Auto Media Arrangement, and larger sets create ordered Pages containing no more than nine Media Items each.
- An explicit heading before the first image maps to `headline`; remaining prose maps to `caption` rather than becoming multiple decorative cards.
- Explicit time, date, or location labels map to `context`, while hashtag syntax or a clear keyword list maps to TagList.
- Links remain links and may produce a QRCode suggestion, but are not converted automatically.
- Usernames, mentions, and trailing signatures do not become Identity without explicit identity structure.

### Guidance and preflight

The first prompt requests media. After media exists, optional prompts may suggest a headline, caption, or share ratio; layout, crop, and focal-point choices remain direct editing actions. Missing media is a non-blocking Content Suggestion when other renderable content exists. Low resolution, likely subject cropping, and empty Pages are Quality Warnings. An Unresolved Asset is a Blocking Error for Raster Export until it is relinked or explicitly removed.

## Internal Notice

### Mapping

- A top-level heading, or a standalone leading line explicitly describing a notice, announcement, arrangement, or instruction, maps to `title`.
- Explicit publisher or department labels map to `issuer`; audience, time, place, effective date, and contact label-value groups map to `keyFacts`.
- Lists under clearly labeled preparation, required-action, materials, or handling sections map to Checklist.
- Timed entries under agenda, process, or schedule headings map to Timeline.
- Important, caution, or special-instruction sections map to Callout; remaining material stays in Section and Rich Text.
- Trailing content maps to `signature` only when explicitly labeled as a publisher, signatory, issue date, or signature rather than by position alone.

### Guidance and preflight

Prompts progress through title, body, key facts, and issuer while showing no more than three at once. Missing recommended Slots produces Content Suggestions. Time and place are suggested specifically only when meeting, event, or attendance language makes them relevant.

## Travel Guide

### Mapping

- A top-level title explicitly naming a destination, guide, itinerary, or travel record maps to `destination`.
- Date, duration, party size, budget, origin, and transport label-value groups map to `overview`.
- Day-number or explicit-date headings establish daily Sections; timed entries inside them map to Timeline.
- Attraction, food, accommodation, and transport headings create corresponding Sections, with nearby text and media kept in the nearest Section.
- Semantic cost tables map to DataTable, while ordinary amount mentions remain text. Packing and preparation lists map to Checklist only under clear headings or checkbox syntax.
- Caution, pitfall, and recommendation sections map to Callout. Links remain links with an optional QRCode suggestion.

### Guidance and preflight

Prompts prioritize destination, itinerary, and overview. Missing recommended Slots produces Content Suggestions. A declared duration that visibly conflicts with daily Sections, or an explicit budget total that conflicts with its items, produces a non-blocking Quality Warning without changing the user's values.

## Resume

### Mapping

- A clear name heading with adjacent phone, email, location, or personal links maps to Identity.
- Summary, self-evaluation, and objective headings map to `summary`.
- Work, internship, project, and education headings establish background Sections. Entries become Timeline items only when dates and an organization, institution, role, or project are sufficiently explicit.
- Responsibilities and achievements remain Rich Text inside the nearest Timeline item rather than becoming Checklist content.
- Short skill or technology lists map to TagList; complete sentences remain Rich Text.
- Certificates, awards, and language qualifications map to credentials Timeline or Checklist content according to explicit structure.
- Portfolio links remain links and may suggest QRCode creation. Unclear experience data remains Section or Rich Text rather than gaining invented employers, roles, or dates.

### Guidance and preflight

Prompts prioritize identity, at least one background group, and skills. Missing those items or contact information produces Content Suggestions. Exceeding the one-page target, using a low-resolution portrait, or approaching the supported minimum readable text size produces Quality Warnings; pagination remains preferable to clipping or unreadable scaling.
