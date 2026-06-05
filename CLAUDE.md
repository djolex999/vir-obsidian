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
## Binary resolution goes through an *interactive* login shell (`-i -l -c`) so nvm/asdf init in ~/.zshrc resolves; spawning vir prepends `dirname(binaryPath)` to PATH so its node shebang finds node.

## Commands
- `npm run dev` — esbuild watch
- `npm run build` — tsc type-check + minified production bundle to main.js
- `npm test` — vitest (logic layer only)
- `npm version <x>` — sync manifest.json + versions.json + package.json

## Release & submission
- Release tags MUST equal manifest.json version exactly — **no `v` prefix** (`0.1.0`, not `v0.1.0`). The GH Actions trigger uses digit-first globs (`[0-9]+.[0-9]+.[0-9]+`) so `v*` never matches; the trigger is read from the *tagged commit*.
- Cut releases by **pushing a bare-semver tag** (`git tag 0.1.3 && git push origin 0.1.3`) and letting `release.yml` do `npm ci` → `npm run build` → `gh release create` with `main.js`+`manifest.json`+`styles.css`. Do **NOT** also run `gh release create` locally — it pre-creates the release and the tag-push workflow then fails with "release already exists" (0.1.2 hit this). One mechanism only. Because the action runs `npm ci`, **commit `package-lock.json`** on every version bump or the build step fails on a lockfile mismatch.
- `minAppVersion` floor follows the highest `@since` of any Obsidian API used (read from `node_modules/obsidian/obsidian.d.ts`); `obsidianmd/no-unsupported-api` enforces it. As of 0.1.3 it's **1.7.2** (`workspace.revealLeaf`'s `Promise<void>` signature).
- Submit to the marketplace via the **community.obsidian.md portal** (not the deprecated obsidianmd/obsidian-releases PR + community-plugins.json flow). Already listed → new releases auto-detect; never re-submit.
- Plugin `name` and manifest `description` must NOT contain the word "Obsidian".
- Details + gotchas: `docs/lessons.md` and `tasks/lessons.md`.
