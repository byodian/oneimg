# Scene Template Families

Template Families provide structurally distinct approaches rather than multiplying the same layout through color variants. Shared Themes carry color and typography, while each Family earns one recognizable characteristic from the meaning of its content.

## Shared Themes

| Theme | Palette | Intended character |
| --- | --- | --- |
| Clear Paper | `#F6F8FB`, `#17202A`, `#2F64D6`, `#E7EEFC` | Neutral reading with a restrained cobalt accent |
| Tide | `#F1F7F6`, `#153A3D`, `#147D78`, `#CBE4E0` | Calm travel and everyday material |
| Pomelo Gold | `#FFF8E8`, `#30261A`, `#C77912`, `#F1D59C` | Warm guides and events without ornamental nostalgia |
| Pine Shade | `#F3F7F2`, `#1F3A2C`, `#3D7B55`, `#C8DECE` | Knowledge, nature, and internal communication |
| Graphite | `#F5F6F7`, `#1B1D21`, `#5D6876`, `#DDE1E6` | Formal, restrained personal and professional material |
| Night Voyage | `#111923`, `#EEF3F7`, `#4BA7B6`, `#243544` | Dark photo-first sharing graphics |

Themes do not impose an OneIMG watermark or decorative signature on exports. Template identity belongs to content structure and the user's material.

## General Long Image

| Family | Structural idea |
| --- | --- |
| Clear Reading | A stable single reading column with strong type hierarchy and light edge markers for Sections |
| Section Cards | Distinct Section groups for tutorials, knowledge notes, and work summaries |
| Visual Editorial | Stronger media rhythm with deliberate captions and image scale |
| Summary Brief | KeyValue, Callout, and DataTable receive priority for reports and information summaries |

Default: Clear Reading, Clear Paper, Continuous, standard Density, PNG. Very long content receives a Semantic Slice Export Bundle suggestion.

## Social Smart Collage

| Family | Structural idea |
| --- | --- |
| Clean Gallery | A restrained outer frame, quiet Captions, and media-first hierarchy work across all supported arrangements |
| Story Card | Stable headline, context, and closing regions frame the media without uncontrolled text overlays |
| Editorial Notes | Dates, places, tags, and Captions receive a deliberate annotation system around the media |
| Full-Bleed Share | Edge-led media and protected text bands create stronger visual impact without sacrificing legibility |

Clean Gallery is the default Template Family. Auto is the default Media Arrangement and may deterministically resolve to a safe Featured, Balanced, Sequence, or Margin Album composition from image count and declared Featured state. Once the user chooses another arrangement, content changes do not replace it silently.

Template Family and Media Arrangement are orthogonal: the Family determines the Page-level information hierarchy, typography, framing, and Caption system, while the arrangement communicates the relationship among Media Items inside a Media Group. Every supported Family provides tested geometry for every supported arrangement and falls back visibly rather than inventing a free layout.

Clear Paper is the default Theme and Night Voyage may be suggested for suitably dark media without automatic switching. The default Page Format is Square 1:1 with standard Density. Photo-only output defaults to high-quality JPEG; text, QRCode, or substantial annotation changes the default to PNG.

Freeform tape, stickers, arbitrary rotation, coordinates, and layers remain outside the Scene.

## Internal Notice

| Family | Structural idea |
| --- | --- |
| Clear Notice | Strong title, key-fact band, body, and signature for chat sharing |
| Department Brief | Issuer, Sections, and summaries receive stronger hierarchy |
| Event Schedule | Timeline, location, and Checklist are prominent |
| Urgent Alert | High-contrast Callout and actions lead only when urgency is explicit content |
| Print Notice | A4 headers, footers, pagination, and signature area without simulated seals |

Default: Clear Notice, Clear Paper, Continuous, standard Density, PNG. Pine Shade may be suggested for internal material. Print Notice changes Page Format to A4 Portrait through a Conversion Draft. Templates never simulate official letterhead, seals, stamps, or legal authority.

## Travel Guide

| Family | Structural idea |
| --- | --- |
| Route Handbook | Day Sections and Timeline form a meaningful route axis |
| Place Atlas | Media Groups and destination notes emphasize places, food, and discovery |
| Compact Itinerary | A dense time-led view for use during the trip |
| Budget Planner | KeyValue, DataTable, and Checklist lead the composition |
| Travel Memories | Media and Caption outweigh planning detail for retrospective sharing |

Default: Route Handbook, Tide, Continuous, standard Density, PNG. Long output receives a Semantic Slice Export Bundle suggestion. Photo-dominant content may receive a JPEG suggestion but never changes encoding silently.

## Resume

| Family | Structural idea |
| --- | --- |
| Clear Single Column | One scan order for Identity, background, and skills across one or more Pages |
| Balanced Two Column | A narrow identity and skills rail supports a primary experience column |
| Project First | Projects and outcomes precede the complete employment timeline |
| Student Start | Education, projects, skills, and awards lead |
| Dense Experience | More history through compact but still readable spacing |

Default: Clear Single Column, Graphite, A4 Portrait, standard Density, PNG. Overflow suggests compact Density without applying it, and multi-Page output creates an Export Bundle. Skill percentages, star ratings, unexplained progress bars, and icon-only contact information are excluded because they reduce clarity and credibility.

## Format Adapters

A Template Family owns tested Format Adapters instead of appearing repeatedly for every Page Format. For example, Clean Gallery may adapt to 1:1, 4:5, and 9:16 while remaining one catalog choice. A separate Family is justified only by a genuinely different information structure.

Only declared responsive behavior inside the selected Family adapts automatically, such as an Auto Media Arrangement responding to image count. Content changes may produce a Presentation Suggestion with a reason and preview but never silently change Family, Theme, Density, or Page Format.
