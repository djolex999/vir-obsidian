# vir-obsidian — Claude context

Obsidian plugin for **vir** (`@djolex999/vir-cli`). MIT. Separate repo from `vir`.

## Non-negotiable architecture (do not relitigate)
1. CLI is the only contract. Shell to `vir` via child_process.spawn + parse JSON. No HTTP, no DB reads, no shared package.
2. Vault read via Obsidian Vault/metadataCache API. Recent tab does NOT call vir. Related tab + Search modal are the only `vir query` callers.
3. Two wire shapes: `VirQueryResult[]` and `VirDoctorResult` (see src/types.ts).
4. Disposal hygiene is marketplace-critical: intervals via registerInterval, events via registerEvent, DOM via registerDomEvent. No manual onunload cleanup.
5. vir's result order is authoritative (MMR-diversified). Preserve `vir query` order — never re-sort by score. Score is informational only.
6. Filter Related/Search by `confidence` (default 0.7), never by `score`.
7. isDesktopOnly: true. Mobile -> placeholder view only, no spawns/intervals.

## Pure logic lives in src/lib/ (vitest-tested). UI verified manually in a sandbox vault.
## Binary resolution goes through a login shell so nvm/asdf paths resolve.

## Commands
- `npm run dev` — esbuild watch
- `npm run build` — tsc type-check + minified production bundle to main.js
- `npm test` — vitest (logic layer only)
- `npm version <x>` — sync manifest.json + versions.json + package.json
