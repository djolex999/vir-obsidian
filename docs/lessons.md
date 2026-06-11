# Lessons — vir-obsidian

Obsidian-specific conventions hit while shipping v0.1.0–0.1.3. Capture once, don't relearn.

## 1. Plugin submission is via the portal, not a GitHub PR (changed ~April/May 2026)

Obsidian migrated community-plugin submissions from GitHub pull requests to a portal at
**community.obsidian.md**. Submit by creating a draft submission entry in the portal that
points at the plugin's repo URL; the portal runs its own validation + attestation form.

The old flow is **deprecated**: forking `obsidianmd/obsidian-releases`, adding an entry to
`community-plugins.json`, and opening a PR with the checklist template. Don't reference it in
new docs.

## 2. The GitHub release tag MUST equal `manifest.json` version exactly — no `v` prefix

Obsidian matches the release by an exact `tag == manifest.version` comparison. A tag like
`v0.1.0` is **rejected** against manifest `0.1.0`. Tag releases as bare semver: `0.1.0`,
`0.1.0-rc.1`.

The GitHub Actions release workflow trigger must therefore match tags **without** a `v`
prefix. Digit-first globs guarantee `v*` tags never match:

```yaml
on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+"   # 0.1.0, 1.0.0
      - "[0-9]+.[0-9]+.[0-9]+-*" # 0.1.0-rc.1 and prereleases
```

Gotcha: GitHub Actions evaluates a tag's `push` trigger from the workflow file **at the
tagged commit** — so commit the trigger change to the default branch first, then tag a commit
that already contains it, or the push won't fire the workflow.

## 3. Cut releases by pushing a bare-semver tag — never *also* run `gh release create`

The release workflow (§2) fires on a tag push and creates the GitHub release itself (`npm ci`
→ `npm run build` → `gh release create` with `main.js`+`manifest.json`+`styles.css`). If you
*also* run `gh release create <tag>` locally, it pre-creates the release **and** pushes the
tag — which triggers the workflow, which then fails with *"a release with the same tag name
already exists."* Pick one mechanism; the tag-push is the canonical one:

```bash
git tag 0.1.3 && git push origin 0.1.3   # let release.yml build + create the release
```

Because the workflow runs `npm ci`, **commit `package-lock.json`** on every version bump or
the build step fails on a lockfile mismatch.

## 4. GUI-launched Obsidian has a minimal PATH — breaks CLI detection and node-shebang spawns

Apps launched from the Dock/Finder inherit a minimal PATH with no `nvm`/`asdf` shims. Two
failures, one cause:

1. **Detecting the CLI** needs an *interactive login* shell (`zsh -i -l -c`) — `nvm` init
   lives in `~/.zshrc`, which a plain login shell doesn't source. Sentinel-wrap the output so
   noisy shell startup (themes, prompts) can't pollute the parsed path.
2. **Spawning a node-shebang CLI** (`#!/usr/bin/env node`) fails with `env: node: No such
   file` unless you prepend `dirname(binaryPath)` to the child's PATH — `node` sits beside the
   binary.

Testing detection from a terminal is a FALSE POSITIVE (it inherits the parent's PATH).
Simulate the GUI env: `env -i HOME=$HOME PATH=/usr/bin:/bin …`.

## 5. Plugin `name` and manifest `description` must not contain the word "Obsidian"

The portal rejects a manifest `description` (and the plugin `name`) containing "Obsidian".
README prose mentioning Obsidian is fine — the rule is only on `name` + `description`. Keep
`package.json` `description` in sync with `manifest.json`.

## 6. `window.setTimeout` (the popout-window timer rule) breaks the Node test runner

The `obsidianmd` lint requires window-scoped timers — `window.setTimeout` /
`window.clearTimeout` — so they bind to the correct popout window. But a Node test runner
(vitest) has no `window`, so any code path that runs `window.setTimeout` throws `window is
not defined`. Shim it in the test that exercises it; keep the production code rule-compliant:

```ts
(globalThis as { window?: unknown }).window ??= globalThis;
```

## 7. `minAppVersion` follows the highest API `@since` — and `no-unsupported-api` flags signature changes, not just new methods

`obsidianmd/no-unsupported-api` reads each API's `@since` from
`node_modules/obsidian/obsidian.d.ts` and flags any call newer than `manifest.minAppVersion`.
Crucially, `@since` tracks **signature changes**, not only new APIs: `workspace.revealLeaf`
has existed for ages, but its `@since` is **1.7.2** — when it started returning
`Promise<void>` (which also turns a bare call into a *floating promise* →
`void workspace.revealLeaf(leaf)`). `setTooltip` is `@since 1.4.4`. Set `minAppVersion` to the
max `@since` of the APIs you use; only swap an API for an older equivalent if it's
disproportionately new AND trivially replaceable (`revealLeaf` isn't — nothing older
reveals/expands a collapsed sidebar).
