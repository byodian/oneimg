# Package OneIMG files with separate Assets

New `.oneimg` files will be ZIP-based OneIMG Packages containing a versioned Package Manifest, one or more committed Documents, Assets, and optional organization metadata and Package Previews without requiring a Project. Legacy JSON files remain importable, while embedding every Asset as Base64 in one JSON document is rejected because it inflates parsing, history, migration, and export costs and prevents efficient Asset reuse.
