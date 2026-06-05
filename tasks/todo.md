# vir-obsidian — tasks

## v0.1.0 / v0.1.1 (shipped)
- [x] Scaffold repo, build (esbuild), manifest, vitest config
- [x] Tested logic layer — IPC client + pure helpers (28 vitest cases, real fake-vir fixtures)
- [x] UI — sidebar (Recent + Related tabs), search modal, settings tab, status bar
- [x] main.ts wiring — mobile guard, view reg, 3 commands, ribbon
- [x] Fix GUI-PATH bug — interactive-login detect + prepend binary dir for node shebang
- [x] README with real hero screenshot; tag-triggered release workflow
- [x] Public repo + releases: 0.1.0 → 0.1.1 (bare-semver tags, no `v`)
- [x] Marketplace submission prep (portal flow)
- [x] Portal review feedback: description "Obsidian"→"vault", builtin-modules→node:module, README placeholder check

## v0.1.2 (shipped — topic category, the plugin half of the vir compose loop)
- [x] `topic` is a first-class category — Related + Recent panes render `vir compose` topic notes with a cyan badge
- [x] `extractVirMeta` maps `type: topic` → `topic` (topics carry NO `category` field) + date fallback `updated`/`created` — Recent sorts-then-slices, so a dateless topic would be sliced off and never show
- [x] `categoryColor("topic")` → `var(--color-cyan)`; `VirCategory` + `VIR_CATEGORIES` extended. **32 vitest cases** (was 28; +4)
- [x] README: topic noted in both pane sections. Bumped via `npm version 0.1.2 --no-git-tag-version` (synced manifest+versions, no v-tag), commit `ffaa411`, pushed
- [x] Released via `gh release create 0.1.2 main.js manifest.json styles.css` (unprefixed tag, raw assets, no zip). Verified: tag `0.1.2`, 3 assets, not draft, manifest==tag. Requires vir-cli **0.8.3** (now published `latest`, emits `topic` hits)

## v0.1.3 (shipped — portal validation lint/type fixes)
The community-portal validation FAILED on 0.1.2 with a Risk + 5 warnings (the Risk
+ disclosures — child_process, vault enumeration, malware scan, attestations — are
informational, NOT failures; left untouched). Fixed all 5 lint/type failures:
- [x] **`no-unsupported-api`** (4 sites) → `minAppVersion` 1.4.0 → **1.7.2** (max of: `setTooltip` @since 1.4.4 ×3; `workspace.revealLeaf` @since 1.7.2 — signature became `Promise<void>`). `revealLeaf` not trivially swappable (reveals/expands a collapsed sidebar). versions.json: `0.1.3 → 1.7.2`.
- [x] **Popout timer rule** — `setTimeout`/`clearTimeout` → `window.*` (5 sites, `vir-client.ts`)
- [x] **Floating promise** — `void workspace.revealLeaf(leaf)` (`main.ts:93`; it now returns a Promise — same line as the no-unsupported-api hit)
- [x] **`no-unsafe-assignment`** — `parse<T>` routes `JSON.parse` through `: unknown` then `as T`
- [x] **README placeholders** filled (`(pending review)`/`(coming soon)`); overview now names topic syntheses in Related/Recent
- [x] **Gotcha:** `window.setTimeout` broke the Node test env (`window is not defined`) → shimmed `window ??= globalThis` in `tests/vir-client.test.ts`. Build clean, **32 vitest cases** green.
- [x] Released via **tag-push → `release.yml`** (NOT `gh release create` — avoids the 0.1.2 double-fire). `package-lock.json` committed so the action's `npm ci` stays in sync.

## In progress / next
- [ ] Confirm the `0.1.3` `release.yml` run went green + the portal re-validates (Risk + 5 warnings cleared).
- [ ] **Clean up the failed `release.yml` run for 0.1.2** (run `27017762251`) — cosmetic red X from the old double-fire.
- [ ] Portal: confirm community.obsidian.md re-validates against 0.1.3; monitor the review window.

## Backlog
- [ ] **OVERDUE — bump GH Actions `checkout@v4` + `setup-node@v4` → `@v5`** (was due **2026-06-02**; today is 2026-06-05). The 0.1.2 run still executed (it failed on "release exists", not the Node-20 deprecation) — on borrowed time.
- [x] **Release mechanism decided: tag-push → `release.yml`** (NOT `gh release create`). 0.1.3 used it cleanly; codified in CLAUDE.md. `gh release create` is what double-fired 0.1.2.
- [ ] Swap placeholder out-links once live: marketplace link in README; "The Compounding Codebase" manifesto at djordje.dev
- [ ] (Optional cleanup) delete stale `0.1.0` release + `v0.1.0-rc.1` prerelease once a later version is accepted

## Roadmap (v0.2.0+)
- [ ] **Topics tab** — proposed in the 0.1.2 pass, deferred as not-cheap (a 3rd `TabId` + a `TopicsTab` view class + `sidebar-view.ts` wiring). A dedicated browse-all-`type: topic` surface, optionally a "Compose new topic" action shelling `vir compose`. Topics already surface in Related + Recent, so this is additive, not required.
- [ ] **Shared wire-type source** with vir-cli — `src/types.ts` `VirQueryResult` duplicates (and has drifted from) vir-cli's `src/output/json.ts`: plugin `project?`/`date?` vs CLI `project: string|null`/`date: string`. A published shared types package stops the next drift. Cross-repo decision; both kept local for now.
- [ ] Phase 2 (post-approval): Canvas, daily notes, templates, transcript browsing, inline editor enhancements
