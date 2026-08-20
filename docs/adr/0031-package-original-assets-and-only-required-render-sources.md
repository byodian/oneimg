# Package Asset Originals and only required Render Sources

Every resolved referenced Asset will contribute its Asset Original to a OneIMG Package, while a normalized Render Source is added only when the minimum supported reader cannot deterministically recreate the current canonical representation; disposable derivatives remain excluded. This accepts conditional duplicate media and Manifest complexity in exchange for source recovery, bounded package size, portable HEIC-like conversions, and WYSIWYG-compatible orientation, color, crop, and content after reopening.
