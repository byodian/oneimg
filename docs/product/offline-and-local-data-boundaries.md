# Offline and Local Data Boundaries

OneIMG's creation core remains useful without an account or network after its application resources have loaded. Offline capability, application upgrades, sensitive work, and managed-export identity are deliberately separate concerns.

## Offline application shell

After one complete successful load, the cached application shell includes the editor, Document Core, initial Block Catalog, Scene guidance, trusted Template pack, Canonical Fonts, Asset Pipeline, Local Repository, and certified Local Export implementation. Offline editing, autosave, OneIMG Package creation and opening, and eligible Local Raster Export remain available. High-Fidelity Export and remote AI Assist become visibly unavailable rather than blocking local work.

Installation as a standalone application is optional and is never promoted through a first-run modal. Offline readiness reports its actual state; OneIMG does not promise offline use before required versioned resources are fully cached.

## Version activation

An active editing session keeps one coherent application bundle, Document model implementation, Template pack, Canonical Font pack, and Canonical Renderer version. A newly downloaded version waits without replacing modules underneath a Document Session or Export Job.

OneIMG offers activation only after current Edit Transactions have durable receipts and no Export Job is using the old bundle. The user may postpone. Activation closes or safely restores sessions, applies validated storage migrations, and then mounts the new Renderer Revision; it never forces a mid-edit reload or mixes old preview code with new export code.

## Sensitive work

Sensitive Document is a local data-flow rule. It disables High-Fidelity Export and remote AI Assist even when an account, quota, or earlier authorization exists. That designation itself is not uploaded.

Ordinary browser storage and the initial OneIMG Package format do not claim application-level encryption. OneIMG explains that device profile security, operating-system encryption, browser clearing, and physical access remain outside this designation. Password-protected packages require a separately designed, reviewed format rather than a lock icon or home-grown encryption added to the ordinary package.

## Account scope

The initial account identifies entitlement and quota for optional managed High-Fidelity Export only. The Export Service does not list, fetch, sync, back up, or share local Drafts, Projects, history, Trash, OneIMG Packages, or unrelated Assets.

Cloud sync, shared editing, public share links, remote Project storage, and real-time collaboration are explicit non-goals for the initial architecture. Cross-device portability uses a user-created OneIMG Package snapshot rather than a linked file or hidden upload. A future synchronization product would require its own content custody, conflict, authorization, deletion, and encryption model rather than expanding the Export Service implicitly.

## Verification

Offline release tests cold-start from the fully cached version with networking disabled, edit and restore a Meaningful Draft, resolve local media, create and reopen a OneIMG Package, and run every eligible Local Export format. Upgrade tests hold an active edit and Export Job while a new bundle arrives, proving that no Renderer Revision changes until safe activation. Privacy tests verify that Sensitive and ordinary local operations issue no content-bearing network requests.
