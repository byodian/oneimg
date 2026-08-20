# Make Document Core the only content authority

OneIMG will treat immutable versioned Document Revisions inside an in-process Document Core as the sole authority for authored content and presentation, while React, Zustand, Tiptap, IndexedDB, preview DOM, packages, and export remain callers, Adapters, or representations. This accepts a substantial rewrite of the current distributed state in exchange for one invariant path, unified history, deterministic serialization, testable migrations, and WYSIWYG rendering from the same meaning.
