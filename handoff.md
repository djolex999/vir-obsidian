# Handoff

State as of **2026-09-29**. Plugin at **0.3.0** (released), minAppVersion 1.7.2.
**90 vitest cases** green, `npm run build` clean. `origin/main` = `9cc565a`
(merge of #4). Tags `0.2.2` and `0.3.0` pushed; both `release.yml` runs
succeeded. Requires vir-cli **0.23.0** (on npm as `latest`). Only `main`
remains on the remote.

## Where we left off

Shipped two releases in one session. **0.2.2** (#3): Recent skips dedupe's
`archived/` folder, a green ✓ for `verified: true`, low-confidence dimming in
Recent, and `VirQueryResult` nullability matched to the CLI. **0.3.0** (#4): a
Review tab listing `vir audit`'s flagged notes worst first, plus an active-note
card (verdict, reason, Approve/Reject, 8 s Undo) on the Review and Related tabs,
three hotkey-able commands, and a version gate (CLI < 0.23.0 → "Update vir"
message). It talks to the new `vir review --json` modes (vir PR #69). Built via
spec → plan → subagent-driven tasks, with a per-task review, a final Opus review,
a fix wave, and a live manual pass in the real vault.

## In flight

- Nothing uncommitted except this handoff and `tasks/todo.md` (sync edits).
- The installed plugin in `~/Vir/vir/.obsidian/plugins/vir/` is a pre-release
  0.3.0 build (same code); update from the marketplace to align.

## Blockers

- **Save-before-approve is unverified.** The `view.save()` flush before an
  action (guards against Obsidian overwriting the CLI's `verified: true`) was
  never exercised: typing into the editor from background automation was unsafe
  in the real vault. Needs a manual run in a throwaway vault.
- Owner decision: GitHub Support purge of commit `361698e` (a fixture with 94
  real client-project items; removed from every branch by a history rewrite, but
  GitHub still serves it by SHA).

## Next session: start here

1. Run the save-before-approve check in a throwaway vault (steps in
   `tasks/todo.md` under v0.3.0). If it fails, ship 0.3.1.
2. Decide on `tests/contract/fixtures/query.json` (4 TRAIN + 1 growthq previews,
   public since July) — recapture filtered to `vir` notes.
3. Then roadmap: 0.4.0 Topics tab + Compose action (`vir compose` would need a
   JSON output shape first).
