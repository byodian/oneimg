# OneIMG Initial Scenes

These initial Scenes compose the shared Block Catalog through advisory Slots. Missing recommended Slots produce guidance rather than mandatory-field failures, and every Scene permits additional unbound Blocks.

## General Long Image

General Long Image is the default Active Scene and the safe destination for content that does not match a more specific use case. It defaults to a Continuous Page and preserves source order during Smart Paste.

| Slot | Guidance | Supported Blocks |
| --- | --- | --- |
| body | Recommended | RichText, Section |
| title | Optional | RichText |
| media | Optional | MediaGroup |
| highlights | Optional | Callout |
| facts | Optional | KeyValue, DataTable |
| closing | Optional | RichText, Identity, QRCode |
| tags | Optional | TagList |

Major headings may establish Sections, but the Scene does not impose an article outline or rewrite the content.

## Social Smart Collage

Social Smart Collage produces image-first sharing graphics on Bounded Pages and permits image-only Documents.

| Slot | Guidance | Supported Blocks |
| --- | --- | --- |
| media | Recommended | MediaGroup |
| headline | Optional | RichText |
| caption | Optional | RichText |
| identity | Optional | Identity |
| context | Optional | KeyValue |
| tags | Optional | TagList |
| shareCode | Optional | QRCode |

Social Smart Collage offers two plain-language outcomes. “拼成一张” places one to nine Media Items on one Bounded Page. “成组分享” creates a Social Share Set of same-format ordered Pages. Importing more than nine images creates additional ordered Pages automatically, and the user may drag items between Pages or choose “从这里分页”.

Source order is semantic and never changes silently. The first imported item is Featured by default without being moved, and the user may choose another Featured Media Item. Deterministic aspect-ratio or quality checks may suggest a different Media Arrangement, but OneIMG does not silently run face recognition, reorder images, or invoke AI. Each Page may use Auto, Featured, Balanced, Sequence, or Margin Album while its Template calculates the concrete layout; arbitrary coordinates, layers, rotation, stickers, and free composition are excluded.

A Social Share Set exports as an ordered ZIP and also allows each Page to be copied or downloaded separately. The set remains ordinary ordered Pages in the Document rather than becoming a social-network publishing workflow.

## Internal Notice

Internal Notice organizes an announcement for chat sharing or printing. It defaults to a Continuous Page and may be converted to Bounded Pages, but it does not provide approval, registration, attendance, acknowledgement, or receipt workflows.

| Slot | Guidance | Supported Blocks |
| --- | --- | --- |
| title | Recommended | RichText |
| issuer | Recommended | Identity |
| keyFacts | Recommended | KeyValue |
| body | Recommended | Section, RichText |
| actions | Optional | Checklist |
| schedule | Optional | Timeline |
| emphasis | Optional | Callout |
| attachments | Optional | MediaGroup, QRCode |
| signature | Optional | Identity, KeyValue |

Key facts commonly describe the audience, time, place, effective date, and contact, but the shared KeyValue structure remains canonical.

## Travel Guide

Travel Guide organizes a planned or retrospective trip on a Continuous Page without becoming a live map, weather, price, or booking product. External destinations may be represented by ordinary links or QRCode content.

| Slot | Guidance | Supported Blocks |
| --- | --- | --- |
| destination | Recommended | RichText |
| cover | Optional | MediaGroup |
| overview | Recommended | KeyValue |
| itinerary | Recommended | Section, Timeline |
| places | Optional | Section, MediaGroup, TagList, RichText |
| foodAndStay | Optional | Section, KeyValue, MediaGroup |
| transport | Optional | Section, Timeline, KeyValue |
| budget | Optional | DataTable |
| packing | Optional | Checklist |
| tips | Optional | Callout |
| links | Optional | QRCode |

Multiple Sections and Timelines may represent individual days while remaining ordinary common Blocks.

## Resume

Resume defaults to a Bounded Page with a one-page advisory target. Overflow creates another Page and may trigger concise-content or denser-Template suggestions, but is never clipped or made unreadably small.

| Slot | Guidance | Supported Blocks |
| --- | --- | --- |
| identity | Recommended | Identity |
| summary | Optional | RichText |
| background | Recommended | Section, Timeline |
| skills | Recommended | TagList, Checklist |
| credentials | Optional | Timeline, Checklist |
| portfolio | Optional | MediaGroup, QRCode |
| additional | Optional | RichText |

The background Slot may bind multiple Blocks representing work, projects, or education. This supports experienced candidates, students, and independent workers without separate resume editors or content types.

Resume starts with the Sensitive Document designation and offers Faithful PDF in addition to Raster Export. It does not claim ATS compatibility. Internal Notice suggests Sensitive mode when its content appears internal, while Travel Guide remains independent of live maps, weather, booking accounts, or network data.

Paste recognition, progressive prompts, and preflight rules for these Scenes are recorded in [Scene Smart Paste Rules](./scene-smart-paste-rules.md).

Their initial presentation directions and defaults are recorded in [Scene Template Families](./scene-template-families.md).

Detailed Smart Collage text boundaries, QR validation, Scene switching, future Scene admission, delivery order, and output behavior are recorded in [Practical Scenes and Output](./practical-scenes-and-output.md).
