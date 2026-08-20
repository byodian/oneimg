# Separate Block semantics from Template composition

The Block Catalog will own semantic accessible DOM, content behavior, and common fallbacks, while the Template Runtime owns bounded layout recipes, Format Adapters, Block Variants, and semantic token application; Scenes will provide guidance without rendering. This accepts a stricter internal vocabulary in exchange for reusable practical Scenes, one Canonical Renderer, testable Templates, and no drift into Scene-specific editors.
