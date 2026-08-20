# Editing Transactions and Accessibility

OneIMG turns high-frequency browser input into a small number of understandable, reversible Document changes. The same semantic operations remain available across pointer, touch, and keyboard input without allowing editor mechanics to alter the Canonical Render Root.

## Interaction states

Normal interaction gives vertical touch gestures to Document scrolling. Rich Text edits on tap or click, while other Blocks select first and expose contextual actions. Escape leaves the deepest nested editing state before clearing Block selection.

A drag, crop, or presentation trial may create a Transient Edit based on one committed Document revision. It can update the Canonical Render Root for immediate WYSIWYG feedback but is not eligible for autosave, Export Snapshot creation, or ordinary history. Applying it produces one Edit Transaction; canceling restores the exact baseline. A reload or crash during a Transient Edit restores the most recent committed revision rather than guessing which intermediate frame the user intended.

On mobile, Block and Media Item ordering starts only from a dedicated handle. Image pan and pinch work only inside “调整图片”. Cross-Page media movement primarily uses explicit destinations, while desktop may additionally drag through Page boundaries. These paths produce the same semantic move operation.

## Edit Transaction contract

An Edit Transaction contains a stable identifier, its source and resulting Document revisions, one user-facing intent category, the reversible semantic change, and enough selection information to restore a useful focus location. It does not record raw pointer movement, every crop frame, hover previews, loading progress, or implementation-specific DOM mutations.

Transaction boundaries are:

- continuous typing coalesces until a short pause, focus change, or structural operation;
- Smart Paste and ordinary paste each commit once;
- one completed drag or keyboard move commits once;
- one applied crop, Media Arrangement, Template, Theme, Density, or Page Format change commits once;
- one multi-file import commits its successful and unresolved results together; and
- an accepted AI Assist or Conversion Draft application commits once, independently of generating its preview.

Undo and redo move between committed revisions and restore a valid selection where possible. Ordinary deletion is immediate because undo is reliable; confirmation is reserved for broader scope. Autosave observes committed transactions only, so it cannot persist an arrangement hover, half-finished drag, or intermediate pinch.

Recent undo history survives reload for a Meaningful Draft. The history Module stores a bounded transaction log and compacts older revisions into checkpoints according to local storage pressure, retaining recovery without accumulating unlimited full-document snapshots. Autosave failure leaves the in-memory committed revision intact, reports the storage problem, and does not claim “已保存”.

## Editing and history Module

Editor callers submit semantic intentions such as insert, replace text, move, remove, apply presentation, or resolve Asset. The Editing Module validates the expected Document revision, applies invariants, produces the next immutable revision and Edit Transaction, manages undo and redo, and exposes committed revisions to autosave. Pointer, keyboard, touch, Smart Paste, and AI Assist do not write Document state through separate paths.

Interactive tools may keep private Transient Edit state and compile it into one semantic intention at completion. This keeps the Module's external Interface small while hiding event coalescing, inverse changes, selection recovery, checkpointing, and storage-pressure behavior in its implementation.

## Repeating Entry Module

Timeline, Checklist, Key Value, Tag List, Media Group, and Data Table share one Repeating Entry Module for stable identities, insertion, deletion, ordering, destination validation, focus restoration, and Edit Transaction creation. Each Block descriptor supplies its scene-neutral entry fields and validation; callers do not reimplement array mutation or keyboard ordering for every Block kind.

Cmd/Ctrl+Enter adds a sibling Repeating Entry. Tab and Shift+Tab traverse fields in semantic order. Backspace at the empty start of an otherwise blank entry removes it through an undoable transaction. A dedicated handle and equivalent menu or keyboard commands reorder entries. Multiline fields retain ordinary Enter behavior.

Deleting the last Media Item removes its Media Group, while other repeating Blocks follow their declared empty-state rule. The shared Module reports that consequence before a broad operation but does not force each Block into an invalid placeholder entry.

## Data Table boundary

Data Table reuses stable row and column identities while adding grid navigation. Arrow keys navigate when a cell is not actively editing; Enter edits; Tab advances to the next semantic cell. Users may add, remove, and reorder rows or columns, declare headers, choose constrained semantic alignment, and paste tab-separated or recognized tabular content.

Cells contain plain semantic text with limited inline emphasis. Formulas, merged cells, arbitrary per-cell colors, nested Blocks, spreadsheet calculations, and presentation-specific dimensions are excluded. Templates own table lines, widths, responsive treatment, and pagination.

## Batch media operations

OneIMG supports adding multiple files in one operation without general Block or Media Item multi-selection. Individual item deletion remains immediate and undoable. Clearing an entire Media Group states its scope and confirms before producing one transaction.

A partial import retains source order: successful files produce resolved Media Items and failed files produce Unresolved Asset entries in their original positions. The whole batch is one undoable transaction with a concise result summary. Cancel stops pending work and offers either undoing the batch or keeping the completed portion; abandoned bytes that no committed Asset references are eligible for prompt cleanup.

## Keyboard and assistive interaction

Document source order is the default reading order, visual reading order, focus order, and exported semantic order. Templates may create columns only when they preserve that declared sequence. Raster output itself cannot carry Alternative Text, but the editor and future semantic outputs retain it.

Every pointer or drag action has a keyboard-accessible menu or command. Focus indication is visible and does not affect Canonical layout. Contextual toolbars use predictable roving focus, Escape returns to the owning content, and focus returns to a sensible neighbor after deletion. Reorder, delete, restore, import failure, unresolved media, and autosave failure produce concise assistive status announcements without stealing focus.

When reduced motion is requested, automatic composition and Page movement avoid spatial transition animation. Meaning, selection, readiness, errors, and drag destinations never depend on color, motion, hover, or icon shape alone.

## Verification

Interaction fixtures exercise the same semantic operation through pointer, touch, keyboard, and menu paths and assert equivalent committed Documents. Tests cover interrupted gestures, rapid undo and redo, reload after deletion, stale revision rejection, cross-Page moves, focus recovery, partial import, storage pressure, composition input, screen-reader labels, and reduced motion. Tests observe results through the Editing and Repeating Entry Interfaces rather than internal event handlers.
