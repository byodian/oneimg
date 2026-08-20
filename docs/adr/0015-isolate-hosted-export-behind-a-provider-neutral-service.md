# Isolate hosted export behind a provider-neutral service

OneIMG will keep Local Export and editing independent of accounts while placing optional managed High-Fidelity Export in a dedicated Export Service behind the owned High-Fidelity Adapter. Cloudflare Browser Run is the first hosted implementation because it fits the existing deployment, but a pinned container or regional provider must pass the same contract and may replace it without changing editor, Scene, or Document code; this accepts a separate deployment in exchange for avoiding cloud-vendor policy throughout the application.
