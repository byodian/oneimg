# Isolate Canonical CSS in versioned Style Packs

OneIMG will ship prebuilt, versioned Style Packs scoped beneath the Canonical Render Root with explicit cascade layers, and will exclude application CSS, global variables, runtime-generated application classes, arbitrary imported CSS, ambient network resources, and stylesheet scraping from Canonical rendering. This accepts explicit CSS ownership and build tooling in exchange for deterministic preview, local export serialization, remote reproduction, and auditable Renderer Revisions.
