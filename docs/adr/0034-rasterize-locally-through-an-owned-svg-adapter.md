# Rasterize locally through an owned SVG Adapter

Local Export will serialize an inert Canonical Render Root, its scoped Style Pack, and exact Resource Resolver outputs into Blob-backed SVG foreign-object input, using Canvas or OffscreenCanvas only for rasterization, bounded transforms, color normalization, and encoding. OneIMG rejects `html2canvas`, global DOM cloning, stylesheet scraping, and large Data URL serialization as canonical paths, accepting a narrower certified feature profile in exchange for modern-CSS fidelity, lower duplication, controlled memory, and WYSIWYG enforcement.
