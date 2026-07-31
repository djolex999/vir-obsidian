# Contract fixtures

Verbatim `vir --json` output. Never hand-edit — recapture:

```sh
vir query "sqlite migrations" --json > query.json
# with Ollama STOPPED (kill `ollama serve`), pins {reachable: false, model: null}:
vir doctor --json > doctor-ollama-down.json
# with Ollama UP but the embed model removed (`ollama rm nomic-embed-text`,
# re-pull after!), pins the 0.14.0 probe semantics {reachable: true, model: null}:
vir doctor --json > doctor-ollama-probe-failed.json
```

Doctor fixtures captured 2026-07-31 against vir-cli 0.14.0;
query.json captured 2026-07-30 against vir-cli 0.12.0.
