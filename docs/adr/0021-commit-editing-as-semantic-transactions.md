# Commit editing as semantic transactions

OneIMG will route every Document change through an Editing Module and record one reversible Edit Transaction per completed user intention, while drag, crop, typing coalescing, and presentation trials remain transient until committed. This accepts a more deliberate interaction-state implementation in exchange for understandable undo, reliable autosave, cross-input consistency, crash recovery, and tests that observe semantic revisions instead of browser events.
