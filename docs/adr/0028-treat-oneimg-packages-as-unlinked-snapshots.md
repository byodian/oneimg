# Treat OneIMG Packages as unlinked snapshots

Opening a OneIMG Package will create local Imported Drafts, and saving another package will explicitly snapshot committed Document Revisions without retaining a live file binding or writing back during Repository autosave. This accepts a separate portability action instead of desktop-style linked-file semantics in exchange for consistent browser behavior, honest save status, safe multi-tab editing, and no hidden external overwrite.
