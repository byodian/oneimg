# OneIMG Product Principles

OneIMG helps people without design expertise turn ordinary text and images into polished visual documents quickly. It is a content-first creation tool, not a general-purpose visual design platform such as Canva.

## Product promises

1. **Start with content.** A user can type or paste immediately into an automatically restored Draft; naming or creating a Project is never a prerequisite.
2. **Good design comes from guidance.** Scenes suggest useful structure, Templates compose it, and Themes tune its appearance. Users choose among meaningful constraints instead of manually designing every coordinate.
3. **Do not become Canva.** OneIMG does not start from a blank artboard or require users to compose arbitrary coordinates and unrestricted layers. Long images, collages, notices, guides, resumes, and fixed-ratio social graphics all use Guided Layout; this does not prohibit a visual editing surface or browser Canvas as an internal export mechanism.
4. **Preserve the user's work.** Scene, Template, and Page Format changes create a Conversion Draft with a mapping preview; they do not silently rewrite or delete the source.
5. **What users see is what they export.** Raster layout and style must have no user-visible difference from the Canonical Preview. A differing export is invalid rather than a lower-quality success; Local and High-Fidelity routes may differ in capability, privacy, latency, and infrastructure but never in the promised composition.
6. **Scenes add expertise, not lock-in.** A Scene may provide an initial Block structure, examples, missing-information prompts, basic checks, Smart Paste mapping, and export presets, but it does not restrict the Document to a private content model.
7. **Edit the result directly.** The rendered Document is the primary editing surface and uses the same Canonical Render Root that defines Clean Preview and Raster Export; structure, guidance, and property controls overlay or surround it without entering its layout.
8. **Never hide overflow.** A Bounded Page flows excess content into another Page or reports a clear preflight warning; it never silently clips content or shrinks text below a readable threshold.
9. **Guide without blocking.** Scenes use non-exported prompts and preflight suggestions rather than mandatory business fields; incomplete but renderable content may still be exported.
10. **Examples are intentional copies.** Scene starters do not silently insert fictional data. Loading a complete example creates an editable example Draft that is clearly distinct from the user's work.
11. **Pasting preserves authorship.** Smart Paste may recover structure and replace foreign presentation, but it does not rewrite, summarize, translate, or invent the user's content.
12. **AI is optional and explicit.** Core creation, Smart Paste, editing, and Local Export work without AI; any remote AI Assist has its own preview and data-transfer authorization.
13. **Presentation starts complete.** Every Scene opens with a safe default Template and Theme so that choosing design options is never a prerequisite for entering content.
14. **Resolution is not fidelity.** Page Format controls composition and Output Scale controls raster dimensions; the WYSIWYG Contract applies equally to every eligible Local or High-Fidelity route and is never an export-quality toggle.
15. **Export never guesses away quality.** Routing, segmentation, format fallback, font substitution, and retries are visible decisions or Findings; no failure silently lowers resolution, fidelity, or content completeness.
16. **Editing and export are independent.** Each Export Job uses an immutable Snapshot while the active Draft remains editable, so neither task blocks or mutates the other.
17. **The local core has no account gate.** Editing, Local Export, OneIMG Packages, and sensitive work remain available without authentication; an account may meter the optional managed High-Fidelity service but never unlock the editor itself.
18. **Remote work is minimal, explicit, and ephemeral.** A remote service receives only the authorized Export Snapshot and its referenced Render Sources, reports the transfer in an Export Receipt, and deletes content according to a short, testable lifecycle.
19. **Providers remain replaceable.** The Export Engine depends on a High-Fidelity Adapter and certified Renderer Revision rather than a particular cloud vendor; managed browsers optimize the initial hosted service while pinned containers remain available for strict reproducibility or regional needs.
20. **Sensitive means local.** Marking a Document sensitive disables High-Fidelity Export and remote AI Assist without uploading that designation; incompatible presentation is repaired locally rather than overriding the boundary.
21. **One intention is one reversible change.** Typing, drag, crop, paste, import, and presentation previews may produce many intermediate events, but history and autosave record only understandable Edit Transactions.
22. **Fast media never changes the result.** Progressive Asset Derivatives may accelerate interaction, but Canonical Preview and Raster Export share the same normalized Render Source, orientation, color interpretation, crop, and content.
23. **One Document has one truth.** Versioned semantic Document Revisions—not React state, editor HTML, IndexedDB rows, or rendered DOM—are the source of editing, history, persistence, preview, packages, and export.
24. **Portability does not require organization.** Any Draft can become a single-Document OneIMG Package without being named, saved into, or promoted to a Project.
25. **Import never replaces active work.** Existing and legacy files create Imported Drafts with visible mapping results; unsupported data remains recoverable rather than clearing the local repository or silently disappearing.
26. **Local-only is not encrypted.** Sensitive prevents remote transfer but does not misrepresent ordinary browser storage or an unprotected OneIMG Package as encrypted at rest.
27. **Accounts do not imply content custody.** The initial account exists only for optional managed-export identity and quota; cloud sync, shared projects, and collaboration remain outside the local creation core.
28. **Packages are explicit snapshots.** Opening a OneIMG Package creates local work and saving another produces a new portable snapshot; ordinary autosave never writes back to an external file or holds it as the live Document.
29. **Portability preserves current meaning, not local residue.** OneIMG Packages contain committed Documents and required Assets, presentation declarations, integrity information, and optional organization—not undo history, Trash, caches, account data, or editor state.
30. **Recovery may be incomplete but never silent.** A OneIMG Package may preserve Unresolved Assets and unknown content with visible recovery data even though Raster Export remains blocked until all target media resolves.
31. **Package data is inert.** Imported Documents, Templates, Rich Text, and media are validated declarative data; package scripts, executable HTML, unrestricted CSS, absolute paths, and ambient network dependencies never run.
32. **Blocks own meaning; Templates own composition.** The Block Catalog defines semantic accessible content, the Template Runtime arranges it through bounded layout recipes, and Scenes provide guidance without acquiring rendering code.
33. **Built-in design works locally first.** Every initial default and recommended Template is Local Certified; optional High-Fidelity Export extends capability but is never required to make the starting presentation usable.
34. **Customization remains intentional.** Style Presets capture reusable Theme, Density, Page Format, brand values, and compatible identity Assets without exposing arbitrary CSS, coordinates, or a first-version Template Builder.
35. **Export work starts on request.** Opening export options plans the result but does not rasterize the Document; each Page is rendered once per Job and reused for compatible files, slices, copy, bundles, and Faithful PDF.
36. **Practical output states its limits.** Faithful PDF preserves the canonical Page appearance but does not masquerade as ATS, semantic, accessible, CMYK, or professional-print output; Platform HTML follows a separate degradation contract.
37. **Quality, privacy, accessibility, and recovery block release.** A faster or more feature-rich build cannot ship by hiding visual mismatch, content loss, inaccessible critical workflows, sensitive-data leakage, or an unsafe migration.

## Initial scene order

1. General text long image
2. Social Smart Collage
3. Internal notice
4. Travel guide
5. Resume

Event invitations, work summaries or weekly reports, and knowledge or tutorial cards are the preferred next discoveries after these initial Scenes prove the shared Block model. Product descriptions, menus, price lists, and reading notes remain evidence-driven candidates rather than promised specialized editors.

## Deliberate non-goals

- A Canva-style general-purpose design platform, blank-artboard workflow, arbitrary coordinates, and unrestricted layer management
- A general photo editor beyond crop, focal point, framing, and presentation-oriented adjustments
- Approval, attendance, map booking, recruitment, or other external business workflows
- Scene-specific editors that prevent content from moving between Scenes
- User-defined or Scene-specific Block kinds in the initial product
- A first-version Template Builder, arbitrary CSS, or unrestricted User Template marketplace
- ATS claims, professional CMYK print production, general SVG design export, or direct posting into third-party social accounts
