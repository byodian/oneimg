# Version Scene guidance without mutating Documents

A Scene Binding will identify the Scene version whose Slots and guidance it uses. Publishing a new Scene version may surface new recommendations but must not silently insert, delete, relabel, or reorder existing content; accepting an upgrade creates a Conversion Draft with a mapping preview. This adds explicit version handling in exchange for preserving user trust and keeping old OneIMG Packages deterministic.
