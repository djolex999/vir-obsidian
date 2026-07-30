# Contract fixtures

Verbatim `vir --json` output. Never hand-edit — recapture:

```sh
vir query "sqlite migrations" --json > query.json
# with Ollama STOPPED, so the fixture pins ollama.model: null on the wire:
vir doctor --json > doctor-ollama-down.json
```

Captured 2026-07-30 against vir-cli 0.12.0.
