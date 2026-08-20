# Allow one active writer per Document

One browser profile will permit only one active writer lease per Document, while other tabs open it read-only and may explicitly take over; an unexpected competing branch becomes a Conflict Draft. OneIMG rejects last-write-wins overwrites, field merging, and an initial CRDT in exchange for preserving local work with a simple model appropriate to a non-collaborative product.
