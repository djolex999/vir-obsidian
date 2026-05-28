# Lessons — vir-obsidian

Obsidian-specific conventions hit while shipping v0.1.0. Capture once, don't relearn.

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
