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

## v0.2.0 (shipped — pdf first-class, the plugin half of the CLI's PDF ingestion)
The CLI emitted `pdf` notes (vir-cli 0.11.0+) that the plugin only rendered as a muted fallback. Made `pdf` first-class, mirroring the 0.1.2 topic work. **32 → 41 vitest cases.** Tag `0.2.0` (bare-semver) on remote; `release.yml` auto-published the GitHub release (main.js + manifest.json + styles.css); marketplace shows 0.2.0.
- [x] `pdf` added to `VirCategory` union + `VIR_CATEGORIES`/`isVirCategory`; `categoryColor("pdf")` → `var(--color-pink)` (distinct from article's orange).
- [x] **Recent-scan fix (the real bug):** `extractVirMeta` now maps `type:pdf`/`type:article` → category — their `category` frontmatter is a SUB-taxonomy (`paper`/`concept`), so `isVirCategory` rejected it → the note was dropped from Recent entirely. This also fixed the **latent article-in-Recent drop** (no article notes existed to expose it). Added `distilled_at` to the date fallback chain so dateless source notes don't sink below the `recentCount` slice (the topic-bug class).
- [x] **Real titles, not slugs:** new `titleFromFrontmatter` (`source_title`/`title`/`topic`); both panes render the real title (the wire carries no title field). Per the chosen option, this improved ALL categories, not just pdf.
- [x] Verified: `vir --version` = 0.11.1 on PATH; `vir query --json` returns the Cabot note as `category:"pdf"`; real-note logic test; build clean; **41/41 tests**. Live in Obsidian: Cabot note renders pink `pdf` badge + real title in Recent + Related.

## v0.2.2 (parity with vir-cli 0.22 — plugin only, no CLI change)
- [x] Recent skips `archived/` (vir dedupe losers keep their frontmatter; Obsidian indexes the folder, unlike `.rejected/`) — `isArchivedPath`
- [x] Green ✓ for `verified: true` in Recent + Related (`metaForPath` replaces `titleForPath`)
- [x] Low-confidence dimming in Recent (`isLowConfidence`; verified never dims) — the docs site already claimed this
- [x] `VirQueryResult.project: string|null`, `date: string` to match CLI json.ts; contract test pins both; the type change caught the search-modal render site
- [x] Cut: `branches` in the row (too long for a compact row)
- [x] 58 vitest cases, build clean; live-checked in vault (✓ on strict-false-unset-migration in Related)
- [x] Merged (#3 → `20f7eb7`), tagged `0.2.2`, released 2026-09-29 (main.js/manifest.json/styles.css)

## Roadmap after 0.2.2 (agreed 2026-09-28)
- ~~0.3.0 review/audit queue~~ shipped 2026-09-29
- 0.4.0 Topics tab + Compose action
- later: Ask the vault (deferred: paid LLM call per ask)

## v0.3.0 (review queue) — RELEASED 2026-09-29 (#4 → `9cc565a`, tag `0.3.0`; needs vir-cli 0.23.0, on npm)
- [x] Task 4: review wire types + VirClient.reviewQueue/review
- [x] Task 5: pure review-queue lib + store
- [x] Task 6: review controller (approve/reject/undo, busy handling)
- [x] Task 7: Review tab + active-note card
- [x] Task 8: commands (approve, reject, open next)
- [x] Task 9: contract fixtures, docs, 0.3.0
- [x] Manual pass in the real vault (6/7; every action reverted): queue+header, approve, reject+Undo, busy, old-CLI gate, no card on topic/archived
- [x] Final-review fix wave: card refresh on file-open, loading/unavailable card states, Undo waits for idle + retries on busy/timeout, no stray navigation, open-next skips active file
- [x] Stale card fix: next note opens with `openFile(file, { active: true })` (612b4f2) — live-verified
- [x] Review-queue contract fixture now keeps only the `vir` project's own notes; branch history rewritten before merge
- [ ] **Verify save-before-approve** (never run): throwaway vault → type in a note → Approve within 1 s → reopen → both `verified: true` and the text present. A failure = 0.3.1
- [ ] Optional: request a GitHub cache purge for the pre-rewrite fixture commit (SHA in the private vir handoff)
- [ ] Recapture `tests/contract/fixtures/query.json` with a vir-only filter (it predates the filter rule)
- [ ] Deferred minors (final review: CAN-WAIT): isolate onChange listeners in ReviewStore.emit; stale-fetch race in undoReject; dedupe ensureReviewSupport while CLI unreachable + filter metadataCache "changed" to the active file; header "0·0·0" above a first-fetch error; notice padding click still dismisses without undo; gate approve/reject commands on CLI ≥ 0.23.0

## v0.3.1 (portal review lint fixes) — RELEASED 2026-09-29 (#5 → `3a580f8`, tag `0.3.1`)
The 0.3.0 portal review FAILED on one error + warnings; 0.3.1 clears them (90 vitest cases, build clean).
- [x] **Error `obsidianmd/no-static-styles-assignment`** (`review-controller.ts:94`): inline `style.cursor` → `.vir-undo-notice { cursor: pointer }` in `styles.css`
- [x] **Warning `no-unsafe-assignment`** (`main.ts:115`): `loadData()` cast to `Partial<VirSettings> | null` before the merge
- [x] **Build provenance attestations**: `release.yml` gets `id-token`/`attestations: write` + `actions/attest-build-provenance@v2` over `main.js`/`manifest.json`/`styles.css`. Run succeeded; attestation itself not yet verified (`gh attestation verify main.js --repo djolex999/vir-obsidian`)
- [ ] Confirm the marketplace rescan of 0.3.1 clears the error
- [ ] **`getSettingDefinitions()`** warning (`settings.ts:24`) deferred: needs Obsidian 1.13 typings + a `minAppVersion` bump to 1.13+, which drops older users. Decide before adopting
- Left as informational by design: shell execution (`child_process` spawn of `vir`), vault enumeration (Recent tab)

## In progress / next
- [x] ~~Confirm the `0.1.3` `release.yml` run + portal re-validate.~~ Long done; 0.2.0 has since shipped via the same tag-push → `release.yml` mechanism cleanly.
- [ ] Portal/marketplace: confirm the listing reflects 0.2.0 (auto-detect from the release); monitor any re-validation.
- [ ] **Clean up old failed/stale CI runs** (the 0.1.2 double-fire run `27017762251`) — cosmetic.

## Backlog
- [x] ~~**bump GH Actions `checkout@v4` + `setup-node@v4` → `@v5`**~~ Already `@v5` in `release.yml` (verified 0.3.1). Original note: (was due 2026-06-02). The 0.2.0 `release.yml` run still succeeded, so the actions aren't broken yet — but the Node-20 deprecation is on borrowed time. Bump on the next release touch.
- [x] ~~**Add GitHub artifact attestations to `release.yml`**~~ Done in 0.3.1. (`actions/attest-build-provenance`) for the release assets — the community-portal validation flagged missing attestations as an informational recommendation (not a blocker). Adds supply-chain provenance for `main.js`/`manifest.json`/`styles.css`. Someday, not urgent.
- [x] **Release mechanism decided: tag-push → `release.yml`** (NOT `gh release create`). 0.1.3 used it cleanly; codified in CLAUDE.md. `gh release create` is what double-fired 0.1.2.
- [ ] Swap placeholder out-links once live: marketplace link in README; "The Compounding Codebase" manifesto at djordje.dev
- [ ] (Optional cleanup) delete stale `0.1.0` release + `v0.1.0-rc.1` prerelease once a later version is accepted

## Roadmap (v0.2.0+)
- [ ] **Topics tab** — proposed in the 0.1.2 pass, deferred as not-cheap (a 3rd `TabId` + a `TopicsTab` view class + `sidebar-view.ts` wiring). A dedicated browse-all-`type: topic` surface, optionally a "Compose new topic" action shelling `vir compose`. Topics already surface in Related + Recent, so this is additive, not required.
- [ ] **Shared wire-type source** with vir-cli — `src/types.ts` `VirQueryResult` is hand-mirrored from vir-cli's `src/output/json.ts` (no shared package). The **category set is realigned as of 0.2.0** (plugin added `pdf` to match the CLI); remaining drift is nullability: plugin `project?`/`date?` vs CLI `project: string\|null`/`date: string` (runtime-safe per the audit), (`VirOllamaStatus.model` was also drifted — widened to `string \| null` and pinned by the contract tests in `tests/contract/`, which parse real fixture output and fail CI on the next drift). A published shared types package would stop the next category-drift. Cross-repo decision; both kept local for now.
- [ ] Phase 2 (post-approval): Canvas, daily notes, templates, transcript browsing, inline editor enhancements
