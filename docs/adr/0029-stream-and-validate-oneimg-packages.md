# Stream and validate OneIMG Packages

OneIMG will read and write Package entries incrementally through one deep Package Module, verify declared SHA-256, byte lengths, media signatures and graph invariants, and reject path traversal, duplicate paths, expansion bombs, executable content, and bounded-resource violations before import commit. This rejects the existing whole-ZIP in-memory Blob approach and accepts a dedicated streaming implementation in exchange for large-media reliability, cancellation, recovery, and treating every Package as hostile declarative input.
