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

Review fixtures (`review-*.json`) captured 2026-09-29 against vir-cli 0.23.0:

```sh
# read-only against the real vault. Public repo: the fixture keeps only the vir
# project's own notes (counts left as-is); never commit other projects' notes
vir review --audited --json | python3 -c 'import json,sys; q=json.load(sys.stdin); q["items"]=[i for i in q["items"] if i["project"]=="vir"]; sys.stdout.write(json.dumps(q, separators=(",",":")))' > review-queue.json
# action fixtures: run in a throwaway sandbox HOME (temp config pointing at a temp vault
# with one demo note), never the real vault
HOME="$SB" vir review --approve=patterns/demo-note-abc12345.md --json > review-approve.json
HOME="$SB" vir review --reject=patterns/demo-note-abc12345.md --json > review-reject.json
HOME="$SB" vir review --restore=demo-note-abc12345.md --json > review-restore.json
# with a live pid written to $SB/.vir/vir.lock (busy payload goes to stderr, exit 1):
HOME="$SB" vir review --approve=patterns/demo-note-abc12345.md --json 2> review-busy.json
```
