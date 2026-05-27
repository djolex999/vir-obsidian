# Vir Obsidian Plugin v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a marketplace-submittable v0.1.0 Obsidian plugin (`vir-obsidian`) that surfaces a user's vir-distilled session knowledge in the Obsidian sidebar via three surfaces: a daemon-health status bar, a Recent/Related sidebar pane, and command-palette search.

**Architecture:** The plugin shells out to the `vir` CLI via `child_process.spawn` and parses JSON — the CLI is the only contract (no HTTP, no DB reads, no shared package). The Recent tab reads the vault directly via the Obsidian Vault/metadataCache API and never calls vir. The Related tab and Search modal are the only features that call `vir query`. Pure logic (IPC parsing, error classification, frontmatter detection, query-text building, formatting, status mapping) is extracted into `src/lib/` so it is unit-testable with vitest without an Obsidian mock; all Obsidian-bound UI is verified manually in a sandbox vault.

**Tech Stack:** TypeScript (strict), esbuild (CJS bundle, `obsidian`/`electron`/builtins external), vitest (logic-layer tests), Obsidian Plugin API ≥1.4.0, Node `child_process`. Target CLI: `@djolex999/vir-cli@0.7.1` (verified published; binary at `~/.nvm/versions/node/v20.20.1/bin/vir`).

---

## Wire contract (captured from the live CLI — this is authoritative)

`vir doctor --json`:

```json
{
  "daemon": "down",
  "lastPollAt": null,
  "lastDistillAt": "2026-05-27T17:42:47.896Z",
  "dbSizeMb": 2.65,
  "vaultPath": "/Users/djmarkovic999/Documents/Vir",
  "configValid": true,
  "ollama": { "reachable": true, "model": "nomic-embed-text" },
  "version": "0.7.1"
}
```

`vir query --json --limit <n> "<question>"` (note: result order is NOT monotonic by score — MMR diversification — and MUST be preserved):

```json
[
  {"path":"decisions/email-verification-approach-agent-a9.md","score":0.5543,"category":"decision","confidence":0.72,"preview":"Project: [[subagents]] ...","project":"subagents","date":"2026-03-15T12:05:28.772Z"},
  {"path":"gotchas/mass-assignment-authorization-ce4092c7.md","score":0.512,"category":"gotcha","confidence":0.95,"preview":"Project: [[novera]] ...","project":"Novera","date":"2026-05-14T23:51:03.250Z"}
]
```

On non-zero exit, vir emits a JSON error payload (forward-compat `kind` union; render `error` only): `{ "error": "<human readable>", "kind": "<machine code>" }`.

---

## Decisions / deliberate deviations from the spec's file list (do not relitigate)

1. **`src/lib/` for pure helpers** (`format.ts`, `frontmatter.ts`, `query-text.ts`, `status.ts`) — extracted so they are unit-testable without an Obsidian mock. The view files stay thin. Matches the user's own `src/lib/` convention.
2. **Filter Related/Search results by `confidence`, not `score`** — `minConfidence` (default 0.7) compares against `result.confidence`. Scores (~0.5) are informational only; never sort by score.
3. **Binary resolution through a login shell** — `detectVirBinary()` runs `$SHELL -lc 'command -v vir'` on POSIX / `where.exe vir` on Windows so nvm/asdf-installed binaries resolve. Default `binaryPath` is `"vir"`; on first load if still default, attempt a best-effort detect and persist the absolute path.
4. **IPC tests use real fake-`vir` fixture scripts**, not a mocked `spawn` — executable node scripts emit known JSON / exit codes / delays. Tests the real spawn path. `VirClient` accepts optional timeout overrides so the timeout path is testable in <200ms.
5. **View-scoped disposal** — the `active-leaf-change` listener and DOM events live on the `ItemView`'s own Component lifecycle (`view.registerEvent` / `view.registerDomEvent`), auto-disposed on view close. The 500ms debounce uses Obsidian's `debounce()` util and is `.cancel()`ed in `onClose`. The status-bar interval uses `plugin.registerInterval`. No manual cleanup in `onunload`.
6. **Undocumented `app.setting` access without `any`** — a minimal `AppWithSetting` interface + cast-through-`unknown` opens the settings tab.

---

## File structure

```
vir-obsidian/
├── .github/workflows/release.yml      # tag v*.*.* -> build + GitHub release (main.js, manifest.json, styles.css)
├── docs/superpowers/plans/2026-05-27-vir-obsidian-v0.1.0.md   # this plan
├── src/
│   ├── main.ts                        # Plugin class: mobile guard, view reg, status bar, commands, settings, ribbon
│   ├── settings.ts                    # VirSettings, DEFAULT_SETTINGS, VirSettingTab
│   ├── vir-client.ts                  # IPC: spawn, JSON parse, typed errors, timeouts, detectVirBinary
│   ├── status-bar.ts                  # VirStatusBar: status item + poll interval (UI shell only)
│   ├── types.ts                       # VirQueryResult, VirDoctorResult, VirCategory, DaemonState, VirErrorPayload
│   ├── lib/
│   │   ├── format.ts                  # relativeTime, categoryColor (pure)
│   │   ├── frontmatter.ts             # isVirCategory, extractVirMeta (pure)
│   │   ├── query-text.ts              # stripFrontmatter, buildQueryText (pure)
│   │   └── status.ts                  # resolveDaemonStatus (pure mapping: doctor|error -> visual descriptor)
│   ├── views/
│   │   ├── sidebar-view.ts            # VirSidebarView (ItemView): Recent + Related tabs
│   │   ├── recent-tab.ts              # vault scan via metadataCache
│   │   ├── related-tab.ts             # vir query on active file, debounced, view-scoped event
│   │   └── result-row.ts             # shared row + empty-state DOM renderers (UI)
│   └── modals/
│       └── search-modal.ts            # VirSearchModal: free-text -> vir query -> rows
├── tests/
│   ├── fixtures/
│   │   ├── fake-vir-ok.mjs            # exit 0, valid query/doctor JSON
│   │   ├── fake-vir-error.mjs         # exit 1, {"error":...,"kind":...}
│   │   ├── fake-vir-badjson.mjs       # exit 0, non-JSON stdout
│   │   └── fake-vir-slow.mjs          # sleeps, for timeout test
│   ├── format.test.ts
│   ├── frontmatter.test.ts
│   ├── query-text.test.ts
│   ├── status.test.ts
│   └── vir-client.test.ts
├── styles.css
├── manifest.json
├── versions.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── vitest.config.ts
├── version.mjs
├── .gitignore
├── README.md
├── LICENSE
└── CLAUDE.md
```

---

## Task 0: Scaffold the repo (config, build, metadata)

**Files:**
- Create: `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `vitest.config.ts`, `version.mjs`, `manifest.json`, `versions.json`, `styles.css`, `.gitignore`, `LICENSE`, `CLAUDE.md`

- [ ] **Step 1: `git init` and create `.gitignore`**

```bash
cd /Users/djmarkovic999/projects/vir-obsidian
git init
```

`.gitignore`:

```
node_modules/
main.js
*.js.map
.DS_Store
data.json
.vscode/
```

- [ ] **Step 2: `package.json`**

```json
{
  "name": "vir-obsidian",
  "version": "0.1.0",
  "description": "An LLM Wiki for Claude Code, in your Obsidian sidebar.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "version": "node version.mjs && git add manifest.json versions.json",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["obsidian", "plugin", "vir", "claude"],
  "author": "Djordje Marković",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.11.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.20.0",
    "obsidian": "^1.4.11",
    "tslib": "^2.6.2",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 3: `tsconfig.json`** (strict, no implicit any)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2018",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["DOM", "ES2018", "ES2020"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 4: `esbuild.config.mjs`**

```js
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", ...builtins],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 5: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 6: `version.mjs`**

```js
import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
```

- [ ] **Step 7: `manifest.json`**

```json
{
	"id": "vir",
	"name": "Vir",
	"version": "0.1.0",
	"minAppVersion": "1.4.0",
	"description": "An LLM Wiki for Claude Code, in your Obsidian sidebar. Surface relevant notes from your distilled session knowledge as you work.",
	"author": "Djordje Marković",
	"authorUrl": "https://github.com/djolex999",
	"isDesktopOnly": true
}
```

- [ ] **Step 8: `versions.json`**

```json
{
	"0.1.0": "1.4.0"
}
```

- [ ] **Step 9: `LICENSE`** — MIT, copyright `2026 Djordje Marković`. (Use the standard MIT text.)

- [ ] **Step 10: `styles.css`**

```css
/* ---- status bar ---- */
.vir-status { display: inline-flex; align-items: center; cursor: pointer; }
.vir-status-dot { font-size: 0.7em; line-height: 1; }
.vir-status-dot.is-ok { color: var(--color-green); }
.vir-status-dot.is-stale { color: var(--color-yellow); }
.vir-status-dot.is-down { color: var(--color-red); }
.vir-status-dot.is-unknown { color: var(--text-muted); }

/* ---- sidebar ---- */
.vir-tabs { display: flex; gap: 4px; padding: 8px 8px 0; border-bottom: 1px solid var(--background-modifier-border); }
.vir-tab { flex: 1; padding: 6px 10px; background: transparent; border: none; border-bottom: 2px solid transparent; color: var(--text-muted); cursor: pointer; font-size: var(--font-ui-small); }
.vir-tab.is-active { color: var(--text-normal); border-bottom-color: var(--interactive-accent); }
.vir-content { padding: 8px; overflow-y: auto; }

/* ---- result rows ---- */
.vir-row { padding: 8px; border-radius: 6px; cursor: pointer; }
.vir-row:hover { background: var(--background-modifier-hover); }
.vir-row-title { font-weight: 600; font-size: var(--font-ui-small); margin-bottom: 4px; }
.vir-row-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: var(--font-ui-smaller); color: var(--text-muted); }
.vir-badge { padding: 1px 6px; border-radius: 4px; font-size: var(--font-ui-smaller); color: var(--text-on-accent); }
.vir-empty { padding: 24px 12px; text-align: center; color: var(--text-muted); font-size: var(--font-ui-small); }
.vir-empty a { cursor: pointer; }

/* ---- search modal ---- */
.vir-search-input { width: 100%; margin-bottom: 8px; }
.vir-search-results { max-height: 50vh; overflow-y: auto; }
```

- [ ] **Step 11: `CLAUDE.md`** — capture the architectural principles so future sessions don't re-litigate:

```markdown
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
```

- [ ] **Step 12: Install deps and smoke-build**

```bash
cd /Users/djmarkovic999/projects/vir-obsidian
npm install
```
Expected: installs without error. (No source yet — defer `npm run build` until `src/main.ts` exists in Task 13.)

- [ ] **Step 13: Commit**

```bash
git add -A && git commit -m "chore: scaffold vir-obsidian plugin (config, build, manifest)"
```

---

## Task 1: `src/types.ts` — wire types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write the types**

```ts
export type VirCategory = "pattern" | "gotcha" | "decision" | "tool" | "article";

export type DaemonState = "ok" | "stale" | "down";

export interface VirQueryResult {
	path: string;
	score: number;
	category: VirCategory;
	confidence: number;
	preview: string;
	project?: string;
	date?: string;
}

export interface VirOllamaStatus {
	reachable: boolean;
	model: string;
}

export interface VirDoctorResult {
	daemon: DaemonState;
	lastPollAt: string | null;
	lastDistillAt: string | null;
	dbSizeMb: number;
	vaultPath: string;
	configValid: boolean;
	ollama: VirOllamaStatus;
	version: string;
}

/** Forward-compat error payload emitted by vir on non-zero exit. Render `error` only. */
export interface VirErrorPayload {
	error: string;
	kind?: string;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -noEmit -skipLibCheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts && git commit -m "feat: add vir wire types"
```

---

## Task 2: `src/lib/format.ts` — relative time + category color (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Test: `tests/format.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { relativeTime, categoryColor } from "../src/lib/format";

const NOW = Date.parse("2026-05-27T12:00:00.000Z");

describe("relativeTime", () => {
	it("returns 'unknown' for null/undefined/invalid", () => {
		expect(relativeTime(null, NOW)).toBe("unknown");
		expect(relativeTime(undefined, NOW)).toBe("unknown");
		expect(relativeTime("not-a-date", NOW)).toBe("unknown");
	});
	it("returns 'just now' under a minute", () => {
		expect(relativeTime("2026-05-27T11:59:30.000Z", NOW)).toBe("just now");
	});
	it("formats minutes / hours / days", () => {
		expect(relativeTime("2026-05-27T11:30:00.000Z", NOW)).toBe("30m ago");
		expect(relativeTime("2026-05-27T09:00:00.000Z", NOW)).toBe("3h ago");
		expect(relativeTime("2026-05-24T12:00:00.000Z", NOW)).toBe("3d ago");
	});
	it("formats months and years", () => {
		expect(relativeTime("2026-03-28T12:00:00.000Z", NOW)).toBe("2mo ago");
		expect(relativeTime("2024-05-27T12:00:00.000Z", NOW)).toBe("2y ago");
	});
});

describe("categoryColor", () => {
	it("maps known categories", () => {
		expect(categoryColor("gotcha")).toBe("var(--color-red)");
		expect(categoryColor("pattern")).toBe("var(--color-blue)");
	});
	it("falls back for unknown", () => {
		expect(categoryColor("nope")).toBe("var(--text-muted)");
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL (module not found / functions undefined).

- [ ] **Step 3: Implement**

```ts
export function relativeTime(
	iso: string | null | undefined,
	now: number = Date.now(),
): string {
	if (!iso) return "unknown";
	const then = Date.parse(iso);
	if (Number.isNaN(then)) return "unknown";

	const sec = Math.round((now - then) / 1000);
	if (sec < 60) return "just now";
	const min = Math.round(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.round(hr / 24);
	if (day < 30) return `${day}d ago`;
	const mo = Math.round(day / 30);
	if (mo < 12) return `${mo}mo ago`;
	const yr = Math.round(mo / 12);
	return `${yr}y ago`;
}

export function categoryColor(category: string): string {
	switch (category) {
		case "pattern":
			return "var(--color-blue)";
		case "gotcha":
			return "var(--color-red)";
		case "decision":
			return "var(--color-purple)";
		case "tool":
			return "var(--color-green)";
		case "article":
			return "var(--color-orange)";
		default:
			return "var(--text-muted)";
	}
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/format.test.ts`
Expected: PASS (all cases). If a boundary like `3h` rounds unexpectedly, the test inputs above were chosen to be exact — keep the implementation.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts tests/format.test.ts && git commit -m "feat: add format helpers (relativeTime, categoryColor)"
```

---

## Task 3: `src/lib/frontmatter.ts` — vir-note detection (TDD)

**Files:**
- Create: `src/lib/frontmatter.ts`
- Test: `tests/frontmatter.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { isVirCategory, extractVirMeta } from "../src/lib/frontmatter";

describe("isVirCategory", () => {
	it("accepts known categories", () => {
		expect(isVirCategory("gotcha")).toBe(true);
		expect(isVirCategory("article")).toBe(true);
	});
	it("rejects unknown / non-strings", () => {
		expect(isVirCategory("note")).toBe(false);
		expect(isVirCategory(42)).toBe(false);
		expect(isVirCategory(undefined)).toBe(false);
	});
});

describe("extractVirMeta", () => {
	it("returns null when frontmatter is missing or has no vir category", () => {
		expect(extractVirMeta(null)).toBeNull();
		expect(extractVirMeta(undefined)).toBeNull();
		expect(extractVirMeta({ title: "x" })).toBeNull();
		expect(extractVirMeta({ category: "journal" })).toBeNull();
	});
	it("extracts category with optional project/date", () => {
		expect(
			extractVirMeta({ category: "decision", project: "vir", date: "2026-05-01T00:00:00.000Z" }),
		).toEqual({ category: "decision", project: "vir", date: "2026-05-01T00:00:00.000Z" });
	});
	it("omits non-string project/date", () => {
		expect(extractVirMeta({ category: "tool", project: 5, date: true })).toEqual({
			category: "tool",
			project: undefined,
			date: undefined,
		});
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { VirCategory } from "../types";

export const VIR_CATEGORIES: readonly VirCategory[] = [
	"pattern",
	"gotcha",
	"decision",
	"tool",
	"article",
];

export function isVirCategory(value: unknown): value is VirCategory {
	return typeof value === "string" && (VIR_CATEGORIES as readonly string[]).includes(value);
}

export interface VirNoteMeta {
	category: VirCategory;
	project?: string;
	date?: string;
}

export function extractVirMeta(
	fm: Record<string, unknown> | null | undefined,
): VirNoteMeta | null {
	if (!fm) return null;
	const category = fm["category"];
	if (!isVirCategory(category)) return null;
	const project = typeof fm["project"] === "string" ? fm["project"] : undefined;
	const date = typeof fm["date"] === "string" ? fm["date"] : undefined;
	return { category, project, date };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/frontmatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/frontmatter.ts tests/frontmatter.test.ts && git commit -m "feat: add vir-note frontmatter detection"
```

---

## Task 4: `src/lib/query-text.ts` — query text builder (TDD)

**Files:**
- Create: `src/lib/query-text.ts`
- Test: `tests/query-text.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { stripFrontmatter, buildQueryText } from "../src/lib/query-text";

describe("stripFrontmatter", () => {
	it("removes a leading YAML block", () => {
		const input = "---\ncategory: decision\ndate: 2026-01-01\n---\nReal body text.";
		expect(stripFrontmatter(input)).toBe("Real body text.");
	});
	it("handles CRLF frontmatter", () => {
		const input = "---\r\ncategory: tool\r\n---\r\nBody.";
		expect(stripFrontmatter(input)).toBe("Body.");
	});
	it("returns content unchanged when there is no frontmatter", () => {
		expect(stripFrontmatter("No frontmatter here.")).toBe("No frontmatter here.");
	});
});

describe("buildQueryText", () => {
	it("combines title and a trimmed body snippet", () => {
		const body = "---\ncategory: gotcha\n---\nFirst line. Second line.";
		expect(buildQueryText("My Note", body, 20)).toBe("My Note\n\nFirst line. Second");
	});
	it("caps body at maxBodyChars (default 200)", () => {
		const body = "x".repeat(500);
		const out = buildQueryText("T", body);
		expect(out).toBe(`T\n\n${"x".repeat(200)}`);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/query-text.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function stripFrontmatter(content: string): string {
	return content.replace(FRONTMATTER_RE, "");
}

export function buildQueryText(title: string, body: string, maxBodyChars = 200): string {
	const snippet = stripFrontmatter(body).trim().slice(0, maxBodyChars);
	return `${title}\n\n${snippet}`.trim();
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/query-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/query-text.ts tests/query-text.test.ts && git commit -m "feat: add query-text builder"
```

---

## Task 5: `src/vir-client.ts` — IPC layer (TDD with fake-vir fixtures)

**Files:**
- Create: `src/vir-client.ts`
- Create: `tests/fixtures/fake-vir-ok.mjs`, `tests/fixtures/fake-vir-error.mjs`, `tests/fixtures/fake-vir-badjson.mjs`, `tests/fixtures/fake-vir-slow.mjs`
- Test: `tests/vir-client.test.ts`

- [ ] **Step 1: Create the fixture scripts (executable node)**

`tests/fixtures/fake-vir-ok.mjs`:

```js
#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("doctor")) {
	process.stdout.write(JSON.stringify({
		daemon: "ok", lastPollAt: "2026-05-27T11:59:00.000Z", lastDistillAt: "2026-05-27T10:00:00.000Z",
		dbSizeMb: 2.65, vaultPath: "/tmp/Vir", configValid: true,
		ollama: { reachable: true, model: "nomic-embed-text" }, version: "0.7.1",
	}));
} else if (args.includes("query")) {
	process.stdout.write(JSON.stringify([
		{ path: "a.md", score: 0.55, category: "decision", confidence: 0.72, preview: "A", project: "x", date: "2026-03-15T12:05:28.772Z" },
		{ path: "b.md", score: 0.51, category: "gotcha", confidence: 0.95, preview: "B", project: "y", date: "2026-05-14T23:51:03.250Z" },
		{ path: "c.md", score: 0.52, category: "tool", confidence: 0.90, preview: "C" },
	]));
}
process.exit(0);
```

`tests/fixtures/fake-vir-error.mjs`:

```js
#!/usr/bin/env node
process.stdout.write(JSON.stringify({ error: "vir daemon unreachable", kind: "daemon_down" }));
process.stderr.write("boom\n");
process.exit(1);
```

`tests/fixtures/fake-vir-badjson.mjs`:

```js
#!/usr/bin/env node
process.stdout.write("this is not json");
process.exit(0);
```

`tests/fixtures/fake-vir-slow.mjs`:

```js
#!/usr/bin/env node
setTimeout(() => { process.stdout.write("[]"); process.exit(0); }, 2000);
```

After creating, make them executable:

```bash
chmod +x tests/fixtures/*.mjs
```

- [ ] **Step 2: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { VirClient, VirNotFoundError, VirTimeoutError, VirCLIError } from "../src/vir-client";

const fx = (name: string) => resolve(__dirname, "fixtures", name);

describe("VirClient", () => {
	it("query parses JSON and preserves CLI order (no score re-sort)", async () => {
		const client = new VirClient(fx("fake-vir-ok.mjs"));
		const results = await client.query("hi", 3);
		expect(results.map((r) => r.path)).toEqual(["a.md", "b.md", "c.md"]);
		expect(results[2].project).toBeUndefined();
	});

	it("doctor parses JSON", async () => {
		const client = new VirClient(fx("fake-vir-ok.mjs"));
		const d = await client.doctor();
		expect(d.daemon).toBe("ok");
		expect(d.ollama.model).toBe("nomic-embed-text");
	});

	it("throws VirNotFoundError when the binary does not exist", async () => {
		const client = new VirClient("/nonexistent/path/vir-xyz");
		await expect(client.doctor()).rejects.toBeInstanceOf(VirNotFoundError);
	});

	it("throws VirCLIError carrying payload.error on non-zero exit", async () => {
		const client = new VirClient(fx("fake-vir-error.mjs"));
		await expect(client.query("hi", 3)).rejects.toMatchObject({
			constructor: VirCLIError,
			message: "vir daemon unreachable",
			exitCode: 1,
		});
	});

	it("throws VirCLIError on unparseable JSON", async () => {
		const client = new VirClient(fx("fake-vir-badjson.mjs"));
		await expect(client.doctor()).rejects.toBeInstanceOf(VirCLIError);
	});

	it("throws VirTimeoutError when the call exceeds the timeout", async () => {
		const client = new VirClient(fx("fake-vir-slow.mjs"), { queryTimeoutMs: 100 });
		await expect(client.query("hi", 3)).rejects.toBeInstanceOf(VirTimeoutError);
	});
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx vitest run tests/vir-client.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/vir-client.ts`**

```ts
import { spawn } from "child_process";
import type { VirQueryResult, VirDoctorResult, VirErrorPayload } from "./types";

export class VirNotFoundError extends Error {
	constructor(message = "vir binary not found") {
		super(message);
		this.name = "VirNotFoundError";
	}
}

export class VirTimeoutError extends Error {
	constructor(message = "vir command timed out") {
		super(message);
		this.name = "VirTimeoutError";
	}
}

export class VirCLIError extends Error {
	constructor(
		message: string,
		public stderr: string,
		public exitCode: number,
	) {
		super(message);
		this.name = "VirCLIError";
	}
}

export interface VirClientOptions {
	queryTimeoutMs?: number;
	doctorTimeoutMs?: number;
}

function tryParseError(raw: string): VirErrorPayload | null {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (parsed && typeof parsed === "object" && typeof (parsed as VirErrorPayload).error === "string") {
			return parsed as VirErrorPayload;
		}
	} catch {
		/* not JSON */
	}
	return null;
}

export class VirClient {
	private readonly queryTimeoutMs: number;
	private readonly doctorTimeoutMs: number;

	constructor(
		private readonly binaryPath: string,
		opts: VirClientOptions = {},
	) {
		this.queryTimeoutMs = opts.queryTimeoutMs ?? 10_000;
		this.doctorTimeoutMs = opts.doctorTimeoutMs ?? 5_000;
	}

	async query(text: string, limit: number): Promise<VirQueryResult[]> {
		const out = await this.run(
			["query", "--json", "--limit", String(limit), text],
			this.queryTimeoutMs,
		);
		return this.parse<VirQueryResult[]>(out);
	}

	async doctor(): Promise<VirDoctorResult> {
		const out = await this.run(["doctor", "--json"], this.doctorTimeoutMs);
		return this.parse<VirDoctorResult>(out);
	}

	private run(args: string[], timeoutMs: number): Promise<string> {
		return new Promise<string>((resolvePromise, rejectPromise) => {
			let settled = false;
			const finish = (fn: () => void) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				fn();
			};

			const child = spawn(this.binaryPath, args);

			const timer = setTimeout(() => {
				finish(() => {
					child.kill("SIGKILL");
					rejectPromise(new VirTimeoutError());
				});
			}, timeoutMs);

			let stdout = "";
			let stderr = "";
			child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
			child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));

			child.on("error", (err: NodeJS.ErrnoException) => {
				finish(() => {
					if (err.code === "ENOENT") rejectPromise(new VirNotFoundError());
					else rejectPromise(new VirCLIError(err.message, stderr, -1));
				});
			});

			child.on("close", (code) => {
				finish(() => {
					if (code === 0) {
						resolvePromise(stdout);
						return;
					}
					const payload = tryParseError(stdout) ?? tryParseError(stderr);
					const message = payload?.error ?? `vir exited with code ${code}`;
					rejectPromise(new VirCLIError(message, stderr, code ?? -1));
				});
			});
		});
	}

	private parse<T>(stdout: string): T {
		try {
			return JSON.parse(stdout) as T;
		} catch {
			throw new VirCLIError("Failed to parse vir JSON output", stdout, 0);
		}
	}
}

/**
 * Resolve an absolute path to the vir binary. Runs through a login shell on POSIX so
 * nvm/asdf-installed binaries resolve (Electron's spawn PATH omits them). Best-effort.
 */
export function detectVirBinary(): Promise<string | null> {
	return new Promise((resolvePromise) => {
		const isWin = process.platform === "win32";
		const shell = isWin ? "where.exe" : process.env.SHELL || "/bin/zsh";
		const args = isWin ? ["vir"] : ["-l", "-c", "command -v vir"];

		let child;
		try {
			child = spawn(shell, args);
		} catch {
			resolvePromise(null);
			return;
		}

		let out = "";
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			resolvePromise(null);
		}, 5_000);

		child.stdout.on("data", (c: Buffer) => (out += c.toString()));
		child.on("error", () => {
			clearTimeout(timer);
			resolvePromise(null);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			const first = out.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
			resolvePromise(code === 0 && first ? first : null);
		});
	});
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run tests/vir-client.test.ts`
Expected: PASS (6/6). The timeout test should complete in ~100ms, not 2s.

- [ ] **Step 6: Commit**

```bash
git add src/vir-client.ts tests/vir-client.test.ts tests/fixtures
git commit -m "feat: add vir IPC client with typed errors, timeouts, binary detection"
```

---

## Task 6: `src/lib/status.ts` — daemon status mapping (TDD)

**Files:**
- Create: `src/lib/status.ts`
- Test: `tests/status.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { resolveDaemonStatus } from "../src/lib/status";
import { VirNotFoundError, VirTimeoutError, VirCLIError } from "../src/vir-client";
import type { VirDoctorResult } from "../src/types";

const NOW = Date.parse("2026-05-27T12:00:00.000Z");
const base: VirDoctorResult = {
	daemon: "ok", lastPollAt: "2026-05-27T11:55:00.000Z", lastDistillAt: null,
	dbSizeMb: 1, vaultPath: "/x", configValid: true,
	ollama: { reachable: true, model: "m" }, version: "0.7.1",
};

describe("resolveDaemonStatus", () => {
	it("ok -> green healthy", () => {
		expect(resolveDaemonStatus({ daemon: "ok" } as VirDoctorResult, NOW)).toEqual({
			cls: "is-ok", tooltip: "Vir: daemon healthy",
		});
	});
	it("stale -> yellow with relative last poll", () => {
		expect(resolveDaemonStatus({ ...base, daemon: "stale" }, NOW)).toEqual({
			cls: "is-stale", tooltip: "Vir: last poll 5m ago",
		});
	});
	it("down -> red not running", () => {
		expect(resolveDaemonStatus({ ...base, daemon: "down" }, NOW)).toEqual({
			cls: "is-down", tooltip: "Vir: daemon not running",
		});
	});
	it("VirNotFoundError -> gray CLI not found", () => {
		expect(resolveDaemonStatus(new VirNotFoundError(), NOW)).toEqual({
			cls: "is-unknown", tooltip: "Vir: CLI not found",
		});
	});
	it("timeout / CLI error -> red unreachable", () => {
		expect(resolveDaemonStatus(new VirTimeoutError(), NOW)).toEqual({
			cls: "is-down", tooltip: "Vir: daemon unreachable",
		});
		expect(resolveDaemonStatus(new VirCLIError("x", "", 1), NOW)).toEqual({
			cls: "is-down", tooltip: "Vir: daemon unreachable",
		});
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/status.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
import type { VirDoctorResult } from "../types";
import { VirNotFoundError } from "../vir-client";
import { relativeTime } from "./format";

export interface DaemonStatusView {
	cls: "is-ok" | "is-stale" | "is-down" | "is-unknown";
	tooltip: string;
}

export function resolveDaemonStatus(
	result: VirDoctorResult | Error,
	now: number = Date.now(),
): DaemonStatusView {
	if (result instanceof Error) {
		if (result instanceof VirNotFoundError) {
			return { cls: "is-unknown", tooltip: "Vir: CLI not found" };
		}
		return { cls: "is-down", tooltip: "Vir: daemon unreachable" };
	}

	switch (result.daemon) {
		case "ok":
			return { cls: "is-ok", tooltip: "Vir: daemon healthy" };
		case "stale":
			return { cls: "is-stale", tooltip: `Vir: last poll ${relativeTime(result.lastPollAt, now)}` };
		case "down":
		default:
			return { cls: "is-down", tooltip: "Vir: daemon not running" };
	}
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all 5 test files pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/status.ts tests/status.test.ts && git commit -m "feat: add daemon status mapping"
```

---

## Task 7: `src/settings.ts` — settings model + tab (UI, manual verify)

**Files:**
- Create: `src/settings.ts`

- [ ] **Step 1: Write the settings model + tab**

```ts
import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type VirPlugin from "./main";
import { detectVirBinary } from "./vir-client";

export interface VirSettings {
	binaryPath: string;
	pollIntervalMs: number;
	autoSurface: boolean;
	recentCount: number;
	relatedLimit: number;
	minConfidence: number;
}

export const DEFAULT_SETTINGS: VirSettings = {
	binaryPath: "vir",
	pollIntervalMs: 30_000,
	autoSurface: true,
	recentCount: 20,
	relatedLimit: 10,
	minConfidence: 0.7,
};

export class VirSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: VirPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Vir binary path")
			.setDesc("Absolute path to the vir CLI. Use Detect to resolve it via your login shell (handles nvm/asdf).")
			.addText((text) =>
				text
					.setPlaceholder("vir")
					.setValue(this.plugin.settings.binaryPath)
					.onChange(async (value) => {
						this.plugin.settings.binaryPath = value.trim() || "vir";
						await this.plugin.saveSettings();
						this.plugin.refreshClient();
					}),
			)
			.addButton((btn) =>
				btn.setButtonText("Detect").onClick(async () => {
					const found = await detectVirBinary();
					if (found) {
						this.plugin.settings.binaryPath = found;
						await this.plugin.saveSettings();
						this.plugin.refreshClient();
						new Notice(`Vir: found at ${found}`);
						this.display();
					} else {
						new Notice("Vir: could not detect the binary. Install @djolex999/vir-cli or set the path manually.");
					}
				}),
			);

		new Setting(containerEl)
			.setName("Daemon poll interval (ms)")
			.setDesc("How often the status bar polls vir doctor. Minimum 5000.")
			.addText((text) =>
				text.setValue(String(this.plugin.settings.pollIntervalMs)).onChange(async (value) => {
					const n = Number(value);
					if (Number.isFinite(n) && n >= 5_000) {
						this.plugin.settings.pollIntervalMs = n;
						await this.plugin.saveSettings();
						this.plugin.restartStatusPolling();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Auto-surface related on file open")
			.addToggle((t) =>
				t.setValue(this.plugin.settings.autoSurface).onChange(async (v) => {
					this.plugin.settings.autoSurface = v;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName("Recent items count").addText((text) =>
			text.setValue(String(this.plugin.settings.recentCount)).onChange(async (value) => {
				const n = Number(value);
				if (Number.isInteger(n) && n > 0) {
					this.plugin.settings.recentCount = n;
					await this.plugin.saveSettings();
				}
			}),
		);

		new Setting(containerEl).setName("Related items limit").addText((text) =>
			text.setValue(String(this.plugin.settings.relatedLimit)).onChange(async (value) => {
				const n = Number(value);
				if (Number.isInteger(n) && n > 0) {
					this.plugin.settings.relatedLimit = n;
					await this.plugin.saveSettings();
				}
			}),
		);

		new Setting(containerEl)
			.setName("Min confidence threshold")
			.setDesc("Hide related results below this confidence (0.0–1.0).")
			.addText((text) =>
				text.setValue(String(this.plugin.settings.minConfidence)).onChange(async (value) => {
					const n = Number(value);
					if (Number.isFinite(n) && n >= 0 && n <= 1) {
						this.plugin.settings.minConfidence = n;
						await this.plugin.saveSettings();
					}
				}),
			);

		new Setting(containerEl)
			.setName("Test connection")
			.setDesc("Runs vir doctor and shows the result.")
			.addButton((btn) =>
				btn.setButtonText("Test").onClick(async () => {
					btn.setDisabled(true).setButtonText("Testing…");
					try {
						const d = await this.plugin.client.doctor();
						new Notice(`Vir ${d.version}: daemon ${d.daemon}, vault ${d.vaultPath}`);
					} catch (err) {
						new Notice(`Vir: ${err instanceof Error ? err.message : String(err)}`);
					} finally {
						btn.setDisabled(false).setButtonText("Test");
					}
				}),
			);
	}
}
```

- [ ] **Step 2: Type-check** — `npx tsc -noEmit -skipLibCheck`. Expected: errors only for not-yet-created `./main` imports (resolved in Task 13). Note them; do not fix here.

- [ ] **Step 3: Commit**

```bash
git add src/settings.ts && git commit -m "feat: add settings model and settings tab"
```

---

## Task 8: `src/views/result-row.ts` — shared row + empty-state renderers (UI)

**Files:**
- Create: `src/views/result-row.ts`

- [ ] **Step 1: Write the renderers**

```ts
import { setTooltip } from "obsidian";
import { categoryColor, relativeTime } from "../lib/format";

export interface RowData {
	title: string;
	category: string;
	project?: string;
	date?: string;
	score?: number;
	onClick: () => void;
}

export function renderResultRow(parent: HTMLElement, data: RowData): void {
	const row = parent.createDiv({ cls: "vir-row" });
	if (typeof data.score === "number") {
		setTooltip(row, `score ${data.score.toFixed(3)}`);
	}
	row.createDiv({ cls: "vir-row-title", text: data.title });

	const meta = row.createDiv({ cls: "vir-row-meta" });
	const badge = meta.createSpan({ cls: "vir-badge", text: data.category });
	badge.style.backgroundColor = categoryColor(data.category);
	if (data.project) meta.createSpan({ text: data.project });
	if (data.date) meta.createSpan({ text: relativeTime(data.date) });

	row.addEventListener("click", data.onClick);
}

export interface EmptyStateAction {
	label: string;
	onClick: () => void;
}

export function renderEmptyState(parent: HTMLElement, message: string, action?: EmptyStateAction): void {
	const wrap = parent.createDiv({ cls: "vir-empty" });
	wrap.createDiv({ text: message });
	if (action) {
		const link = wrap.createEl("a", { text: action.label });
		link.addEventListener("click", action.onClick);
	}
}
```

> Note: `result-row.ts` uses `addEventListener` directly because rows are recreated on every render inside a container that is fully cleared (`empty()`) by the owning view/modal, whose Component lifecycle owns the container. The listeners die with the elements. Intervals and long-lived events still go through `register*`.

- [ ] **Step 2: Commit**

```bash
git add src/views/result-row.ts && git commit -m "feat: add shared result-row and empty-state renderers"
```

---

## Task 9: `src/views/recent-tab.ts` — vault scan (UI)

**Files:**
- Create: `src/views/recent-tab.ts`

- [ ] **Step 1: Write the Recent tab**

```ts
import { App, TFile } from "obsidian";
import type VirPlugin from "../main";
import { extractVirMeta } from "../lib/frontmatter";
import { renderResultRow, renderEmptyState } from "./result-row";

export class RecentTab {
	constructor(
		private app: App,
		private plugin: VirPlugin,
	) {}

	render(container: HTMLElement): void {
		container.empty();

		const notes = this.collect();
		if (notes.length === 0) {
			renderEmptyState(container, "No vir-distilled notes found in this vault yet.");
			return;
		}

		for (const { file, date, category, project } of notes) {
			renderResultRow(container, {
				title: file.basename,
				category,
				project,
				date,
				onClick: () => this.app.workspace.getLeaf(false).openFile(file),
			});
		}
	}

	private collect(): Array<{ file: TFile; category: string; project?: string; date?: string }> {
		const rows: Array<{ file: TFile; category: string; project?: string; date?: string }> = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
			const meta = extractVirMeta(fm);
			if (!meta) continue;
			rows.push({ file, category: meta.category, project: meta.project, date: meta.date });
		}
		rows.sort((a, b) => (Date.parse(b.date ?? "") || 0) - (Date.parse(a.date ?? "") || 0));
		return rows.slice(0, this.plugin.settings.recentCount);
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/recent-tab.ts && git commit -m "feat: add Recent tab (vault scan via metadataCache)"
```

---

## Task 10: `src/views/related-tab.ts` — vir query, debounced, view-scoped (UI)

**Files:**
- Create: `src/views/related-tab.ts`

- [ ] **Step 1: Write the Related tab**

```ts
import { App, Debouncer, debounce, TFile, MarkdownView } from "obsidian";
import type { ItemView } from "obsidian";
import type VirPlugin from "../main";
import { VirNotFoundError } from "../vir-client";
import { buildQueryText } from "../lib/query-text";
import { renderResultRow, renderEmptyState } from "./result-row";
import { openPluginSettings } from "../lib/app-setting";

export class RelatedTab {
	private container: HTMLElement | null = null;
	private debouncedRefresh: Debouncer<[], void>;

	constructor(
		private app: App,
		private plugin: VirPlugin,
		private view: ItemView,
	) {
		this.debouncedRefresh = debounce(() => void this.refresh(), 500, false);
	}

	/** Called by the view once, when the Related tab's container is created. */
	mount(container: HTMLElement): void {
		this.container = container;
		this.view.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.plugin.settings.autoSurface) this.debouncedRefresh();
			}),
		);
		void this.refresh();
	}

	unmount(): void {
		this.debouncedRefresh.cancel();
		this.container = null;
	}

	/** Force an immediate refresh (used by the "Surface related notes" command). */
	forceRefresh(): void {
		void this.refresh();
	}

	private async refresh(): Promise<void> {
		const container = this.container;
		if (!container) return;
		container.empty();

		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			renderEmptyState(container, "No active note. Open a markdown note to see related distilled knowledge.");
			return;
		}

		const loading = container.createDiv({ cls: "vir-empty", text: "Searching…" });

		let results;
		try {
			const body = await this.app.vault.cachedRead(file);
			const text = buildQueryText(file.basename, body);
			results = await this.plugin.client.query(text, this.plugin.settings.relatedLimit);
		} catch (err) {
			container.empty();
			if (err instanceof VirNotFoundError) {
				renderEmptyState(container, "Vir CLI not configured.", {
					label: "Open settings",
					onClick: () => openPluginSettings(this.app, this.plugin.manifest.id),
				});
			} else {
				renderEmptyState(container, "Vir daemon unreachable. Check that the daemon is running.");
			}
			return;
		}

		loading.remove();

		// Preserve vir's MMR order. Filter by confidence (NOT score) and drop the active file.
		const filtered = results.filter(
			(r) => r.path !== file.path && r.confidence >= this.plugin.settings.minConfidence,
		);

		if (filtered.length === 0) {
			renderEmptyState(container, "No related notes found.");
			return;
		}

		for (const r of filtered) {
			renderResultRow(container, {
				title: titleFromPath(r.path),
				category: r.category,
				project: r.project,
				date: r.date,
				score: r.score,
				onClick: () => this.openByPath(r.path),
			});
		}
	}

	private openByPath(path: string): void {
		const target = this.app.vault.getAbstractFileByPath(path);
		if (target instanceof TFile) {
			void this.app.workspace.getLeaf(false).openFile(target);
		}
	}
}

function titleFromPath(path: string): string {
	const base = path.split("/").pop() ?? path;
	return base.replace(/\.md$/i, "");
}
```

> `MarkdownView` import is unused above — remove it; kept here only as a reminder that "active markdown file" means `getActiveFile()` with `extension === "md"`, which is simpler and correct.

Corrected import line:

```ts
import { App, Debouncer, debounce, TFile } from "obsidian";
```

- [ ] **Step 2: Create `src/lib/app-setting.ts`** (typed access to the undocumented settings API — no `any`)

```ts
import type { App } from "obsidian";

interface AppWithSetting {
	setting: {
		open(): void;
		openTabById(id: string): void;
	};
}

export function openPluginSettings(app: App, pluginId: string): void {
	const a = app as unknown as AppWithSetting;
	a.setting.open();
	a.setting.openTabById(pluginId);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/views/related-tab.ts src/lib/app-setting.ts
git commit -m "feat: add Related tab (debounced vir query, view-scoped event)"
```

---

## Task 11: `src/views/sidebar-view.ts` — the ItemView with tabs (UI)

**Files:**
- Create: `src/views/sidebar-view.ts`

- [ ] **Step 1: Write the view**

```ts
import { ItemView, WorkspaceLeaf } from "obsidian";
import type VirPlugin from "../main";
import { RecentTab } from "./recent-tab";
import { RelatedTab } from "./related-tab";

export const VIR_VIEW_TYPE = "vir-sidebar";

type TabId = "recent" | "related";

export class VirSidebarView extends ItemView {
	private recentTab: RecentTab;
	private relatedTab: RelatedTab;
	private activeTab: TabId = "recent";

	private tabButtons: Record<TabId, HTMLElement> = {} as Record<TabId, HTMLElement>;
	private recentContainer!: HTMLElement;
	private relatedContainer!: HTMLElement;

	constructor(leaf: WorkspaceLeaf, private plugin: VirPlugin) {
		super(leaf);
		this.recentTab = new RecentTab(this.app, this.plugin);
		this.relatedTab = new RelatedTab(this.app, this.plugin, this);
	}

	getViewType(): string {
		return VIR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return "Vir";
	}
	getIcon(): string {
		return "brain-circuit";
	}

	async onOpen(): Promise<void> {
		const root = this.contentEl;
		root.empty();
		root.addClass("vir-view");

		const tabs = root.createDiv({ cls: "vir-tabs" });
		this.tabButtons.recent = this.makeTab(tabs, "recent", "Recent");
		this.tabButtons.related = this.makeTab(tabs, "related", "Related");

		this.recentContainer = root.createDiv({ cls: "vir-content" });
		this.relatedContainer = root.createDiv({ cls: "vir-content" });

		this.relatedTab.mount(this.relatedContainer);
		this.show(this.activeTab);
	}

	async onClose(): Promise<void> {
		this.relatedTab.unmount();
	}

	private makeTab(parent: HTMLElement, id: TabId, label: string): HTMLElement {
		const btn = parent.createEl("button", { cls: "vir-tab", text: label });
		this.registerDomEvent(btn, "click", () => this.show(id));
		return btn;
	}

	private show(id: TabId): void {
		this.activeTab = id;
		this.tabButtons.recent.toggleClass("is-active", id === "recent");
		this.tabButtons.related.toggleClass("is-active", id === "related");
		this.recentContainer.toggle(id === "recent");
		this.relatedContainer.toggle(id === "related");
		if (id === "recent") this.recentTab.render(this.recentContainer);
	}

	/** Used by the "Surface related notes" command. */
	focusRelatedAndRefresh(): void {
		this.show("related");
		this.relatedTab.forceRefresh();
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/views/sidebar-view.ts && git commit -m "feat: add sidebar ItemView with Recent/Related tabs"
```

---

## Task 12: `src/modals/search-modal.ts` — Vir: Search vault (UI)

**Files:**
- Create: `src/modals/search-modal.ts`

- [ ] **Step 1: Write the modal**

```ts
import { App, Modal, TFile } from "obsidian";
import type VirPlugin from "../main";
import { VirNotFoundError } from "../vir-client";
import { renderResultRow, renderEmptyState } from "../views/result-row";

export class VirSearchModal extends Modal {
	private resultsEl!: HTMLElement;

	constructor(app: App, private plugin: VirPlugin) {
		super(app);
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.createEl("h3", { text: "Vir: Search vault" });

		const input = contentEl.createEl("input", {
			cls: "vir-search-input",
			attr: { type: "text", placeholder: "Ask your distilled knowledge…" },
		});
		this.resultsEl = contentEl.createDiv({ cls: "vir-search-results" });

		this.registerDomEvent(input, "keydown", (evt: KeyboardEvent) => {
			if (evt.key === "Enter") {
				evt.preventDefault();
				void this.runSearch(input.value.trim());
			}
		});
		input.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private async runSearch(text: string): Promise<void> {
		if (!text) return;
		this.resultsEl.empty();
		this.resultsEl.createDiv({ cls: "vir-empty", text: "Searching…" });

		let results;
		try {
			results = await this.plugin.client.query(text, this.plugin.settings.relatedLimit);
		} catch (err) {
			this.resultsEl.empty();
			const message =
				err instanceof VirNotFoundError
					? "Vir CLI not configured."
					: `Vir error: ${err instanceof Error ? err.message : String(err)}`;
			renderEmptyState(this.resultsEl, message);
			return;
		}

		this.resultsEl.empty();
		if (results.length === 0) {
			renderEmptyState(this.resultsEl, "No results.");
			return;
		}

		// Preserve vir's MMR order — no client-side re-sort.
		for (const r of results) {
			renderResultRow(this.resultsEl, {
				title: r.path.split("/").pop()?.replace(/\.md$/i, "") ?? r.path,
				category: r.category,
				project: r.project,
				date: r.date,
				score: r.score,
				onClick: () => {
					const file = this.app.vault.getAbstractFileByPath(r.path);
					if (file instanceof TFile) {
						void this.app.workspace.getLeaf(false).openFile(file);
						this.close();
					}
				},
			});
		}
	}
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modals/search-modal.ts && git commit -m "feat: add Vir search modal"
```

---

## Task 13: `src/main.ts` + `src/status-bar.ts` — wire everything (UI)

**Files:**
- Create: `src/status-bar.ts`, `src/main.ts`

- [ ] **Step 1: Write `src/status-bar.ts`**

```ts
import { setTooltip } from "obsidian";
import type VirPlugin from "./main";
import { resolveDaemonStatus } from "./lib/status";

export class VirStatusBar {
	private dot: HTMLElement;
	private intervalId: number | null = null;

	constructor(private plugin: VirPlugin) {
		const item = this.plugin.addStatusBarItem();
		item.addClass("vir-status");
		this.dot = item.createSpan({ cls: "vir-status-dot is-unknown", text: "●" });
		this.plugin.registerDomEvent(item, "click", () => this.plugin.openSettings());
		setTooltip(item, "Vir");
		this.item = item;
	}

	private item: HTMLElement;

	start(): void {
		void this.poll();
		this.scheduleInterval(this.plugin.settings.pollIntervalMs);
	}

	restart(): void {
		this.scheduleInterval(this.plugin.settings.pollIntervalMs);
	}

	private scheduleInterval(ms: number): void {
		if (this.intervalId !== null) window.clearInterval(this.intervalId);
		this.intervalId = window.setInterval(() => void this.poll(), Math.max(5_000, ms));
		this.plugin.registerInterval(this.intervalId);
	}

	private async poll(): Promise<void> {
		let view;
		try {
			view = resolveDaemonStatus(await this.plugin.client.doctor());
		} catch (err) {
			view = resolveDaemonStatus(err instanceof Error ? err : new Error(String(err)));
		}
		this.dot.className = `vir-status-dot ${view.cls}`;
		setTooltip(this.item, view.tooltip);
	}
}
```

> `registerInterval` returns the id and registers it for disposal; calling `window.clearInterval` before re-registering on `restart()` prevents stacked intervals when the poll setting changes. Both the cleared and the new id are registered, which is harmless (clearing an already-cleared id is a no-op).

- [ ] **Step 2: Write `src/main.ts`**

```ts
import { Plugin, Platform, WorkspaceLeaf, ItemView } from "obsidian";
import { VirSettings, DEFAULT_SETTINGS, VirSettingTab } from "./settings";
import { VirClient, detectVirBinary } from "./vir-client";
import { VirStatusBar } from "./status-bar";
import { VIR_VIEW_TYPE, VirSidebarView } from "./views/sidebar-view";
import { VirSearchModal } from "./modals/search-modal";
import { openPluginSettings } from "./lib/app-setting";

export default class VirPlugin extends Plugin {
	settings!: VirSettings;
	client!: VirClient;
	private statusBar: VirStatusBar | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		if (Platform.isMobile) {
			this.registerMobilePlaceholder();
			return;
		}

		this.client = new VirClient(this.settings.binaryPath);

		// Best-effort one-time auto-detect if the path is still the bare default.
		if (this.settings.binaryPath === "vir") {
			void detectVirBinary().then((found) => {
				if (found) {
					this.settings.binaryPath = found;
					void this.saveSettings();
					this.refreshClient();
				}
			});
		}

		this.registerView(VIR_VIEW_TYPE, (leaf) => new VirSidebarView(leaf, this));

		this.addRibbonIcon("brain-circuit", "Vir: open sidebar", () => void this.activateView());

		this.statusBar = new VirStatusBar(this);
		this.statusBar.start();

		this.addSettingTab(new VirSettingTab(this.app, this));

		this.addCommand({
			id: "search-vault",
			name: "Search vault",
			callback: () => new VirSearchModal(this.app, this).open(),
		});
		this.addCommand({
			id: "surface-related-notes",
			name: "Surface related notes",
			callback: () => void this.surfaceRelated(),
		});
		this.addCommand({
			id: "open-settings",
			name: "Open settings",
			callback: () => this.openSettings(),
		});
	}

	private registerMobilePlaceholder(): void {
		this.registerView(VIR_VIEW_TYPE, (leaf) => new MobilePlaceholderView(leaf));
		this.addRibbonIcon("brain-circuit", "Vir", () => void this.activateView());
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshClient(): void {
		this.client = new VirClient(this.settings.binaryPath);
	}

	restartStatusPolling(): void {
		this.statusBar?.restart();
	}

	openSettings(): void {
		openPluginSettings(this.app, this.manifest.id);
	}

	private async activateView(): Promise<WorkspaceLeaf> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIR_VIEW_TYPE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (leaf) await leaf.setViewState({ type: VIR_VIEW_TYPE, active: true });
		}
		if (leaf) workspace.revealLeaf(leaf);
		return leaf as WorkspaceLeaf;
	}

	private async surfaceRelated(): Promise<void> {
		const leaf = await this.activateView();
		const view = leaf?.view;
		if (view instanceof VirSidebarView) view.focusRelatedAndRefresh();
	}
}

class MobilePlaceholderView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}
	getViewType(): string {
		return VIR_VIEW_TYPE;
	}
	getDisplayText(): string {
		return "Vir";
	}
	getIcon(): string {
		return "brain-circuit";
	}
	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.createDiv({
			cls: "vir-empty",
			text: "Vir is desktop-only — it relies on the vir CLI, which is not available on mobile.",
		});
	}
}
```

- [ ] **Step 3: Type-check the whole project**

Run: `npx tsc -noEmit -skipLibCheck`
Expected: NO errors. (Fix any cross-module mismatch — method names like `refreshClient`, `restartStatusPolling`, `openSettings`, `focusRelatedAndRefresh`, `forceRefresh` must match their call sites.)

- [ ] **Step 4: Production build + bundle-size check**

Run:
```bash
npm run build
ls -la main.js
```
Expected: `main.js` produced at repo root; size well under 500kb (expect ~30–60kb).

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/status-bar.ts main.js
git commit -m "feat: wire plugin entry — status bar, view, commands, mobile placeholder"
```
> `main.js` is gitignored for normal dev; it is force-added only if you want the built artifact tracked. Otherwise drop it from the commit — the release workflow rebuilds it. (Recommended: do NOT commit main.js; remove it from the add.)

---

## Task 14: Manual verification in a sandbox vault

> No automated tests cover the Obsidian-bound UI; this protocol is how v0.1.0's acceptance criteria are met. Your real Vir vault is at `/Users/djmarkovic999/Documents/Vir` and contains genuine vir-distilled notes — ideal test data.

- [ ] **Step 1: Install the built plugin into a test vault**

```bash
VAULT="/Users/djmarkovic999/Documents/Vir"
DEST="$VAULT/.obsidian/plugins/vir"
mkdir -p "$DEST"
cp main.js manifest.json styles.css "$DEST/"
```
Then in Obsidian: Settings → Community plugins → enable "Vir". (Use a throwaway copy of the vault if you prefer not to touch the real one.)

- [ ] **Step 2: Verify against acceptance criteria — check each:**
  - [ ] Plugin loads with **no console errors** (Cmd+Opt+I → Console).
  - [ ] **Status bar** shows a colored dot; tooltip reflects daemon state. Run `vir schedule` to start/stop the daemon and confirm the dot updates within the poll interval.
  - [ ] **Recent tab** lists vir notes, newest first, with category badges + project + relative date. Click opens the note.
  - [ ] **Related tab** updates within ~600ms of switching notes (when auto-surface on). Shows correct empty states: no active note, no results, CLI not configured (set a bad binary path), daemon unreachable.
  - [ ] Confirm Related/Search **result order matches `vir query` CLI output** for the same text (no score re-sort).
  - [ ] All three **commands** appear and work (`Vir: Search vault`, `Vir: Surface related notes`, `Vir: Open settings`).
  - [ ] **Settings persist** across `disable → enable` of the plugin. Detect button resolves the nvm path. Test connection shows daemon info.
  - [ ] Toggle **auto-surface off** → switching notes does not auto-query; `Surface related notes` command still works.

- [ ] **Step 3: Record any bugs found, fix at the source, rebuild, re-copy, re-verify.** Commit fixes individually.

---

## Task 15: README + LICENSE polish

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`** per the spec's structure:
  1. Hero: one-sentence pitch + screenshot placeholder (`docs/screenshot.png` — TODO before marketplace submission).
  2. What it does: three bullets (status bar / sidebar / commands).
  3. Install: marketplace link placeholder + manual install (copy `main.js`+`manifest.json`+`styles.css` into `<vault>/.obsidian/plugins/vir/`).
  4. Setup: `npm i -g @djolex999/vir-cli`, run `vir init`, then in plugin settings click **Detect** (or set the absolute path), confirm with **Test connection**.
  5. Three sections (one per surface) with screenshot placeholders.
  6. Link out: vir CLI repo, "The Compounding Codebase" manifesto (placeholder until live at djordje.dev).
  7. License: MIT.
  Include the PATH/nvm note in Setup (why Detect exists).

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: add README for marketplace listing"
```

---

## Task 16: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write `.github/workflows/release.yml`**

```yaml
name: Release Obsidian plugin

on:
  push:
    tags:
      - "v*.*.*"
      - "v*.*.*-*"

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create "$GITHUB_REF_NAME" \
            --title "$GITHUB_REF_NAME" \
            --notes "Release $GITHUB_REF_NAME" \
            main.js manifest.json styles.css
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml && git commit -m "ci: add tag-triggered release workflow"
```

---

## Task 17: Release dry-run + final gate (after you create the GitHub remote)

> Per your decision, the public repo is created only when you're ready. These steps run after `gh repo create vir-obsidian --public --source . --remote origin --description "An LLM Wiki for Claude Code, in your Obsidian sidebar." && git push -u origin main`.

- [ ] **Step 1: Final full check**

```bash
npm test && npm run build && ls -la main.js
```
Expected: all tests pass, `main.js` built, under 500kb.

- [ ] **Step 2: RC prerelease to test the workflow**

```bash
npm version 0.1.0 --no-git-tag-version   # syncs manifest/versions (already 0.1.0 — confirm no drift)
git tag v0.1.0-rc.1 && git push origin v0.1.0-rc.1
```
Watch the Action; confirm a prerelease appears with `main.js`, `manifest.json`, `styles.css` attached. If the workflow created it as a full release, add `--prerelease` to the `gh release create` line for `-rc` tags (or accept it as-is for a throwaway RC).

- [ ] **Step 3: Final v0.1.0 tag**

```bash
git tag v0.1.0 && git push origin v0.1.0
```
Confirm the release has all three assets, not draft, not prerelease.

- [ ] **Step 4: Marketplace submission (manual, starts the 2–4 week clock)**
  - Replace screenshot placeholders with a real screenshot (sidebar + open note with frontmatter).
  - Fork `obsidianmd/obsidian-releases`, add an entry to `community-plugins.json` pointing to `djolex999/vir-obsidian`, open the PR.

---

## Self-review against the spec

- **Status bar (3 states + unknown):** Task 6 (mapping) + Task 13 (poll/render). ✓ Click → settings (Task 13 status-bar). ✓ Interval via `registerInterval`. ✓
- **Sidebar Recent tab (no vir calls, frontmatter `category` detection, sort by date desc, top N, row format, click to open):** Task 3 + Task 9. ✓
- **Sidebar Related tab (active-leaf-change via registerEvent, autoSurface gate, 500ms debounce, query from title+200 chars frontmatter-stripped, exclude own path, minConfidence filter, 4 empty states, order preserved):** Task 4 + Task 10. ✓ View-scoped event + debounce cancel. ✓
- **Commands (Search vault, Surface related, Open settings):** Task 12 + Task 13. ✓
- **Settings (all 7 fields + Detect + Test connection, persistence):** Task 7. ✓ Poll interval min 5000 enforced in setter + interval scheduler. ✓
- **IPC (spawn, JSON parse, typed errors, 10s/5s timeouts, branch on error classes, render payload.error):** Task 5. ✓ Confidence-not-score filter enforced (Task 10). ✓
- **Mobile (placeholder view, no spawns/intervals/polls):** Task 13 `registerMobilePlaceholder`. ✓
- **Build (esbuild CJS, externals, strict TS, <500kb, npm scripts dev/build/version):** Task 0 + Task 13 Step 4. ✓
- **Release workflow (tag-triggered, 3 assets, RC first):** Task 16 + Task 17. ✓
- **README structure + LICENSE + CLAUDE.md:** Task 15 + Task 0. ✓
- **Disposal hygiene (registerInterval/registerEvent/registerDomEvent, no manual onunload cleanup):** status bar interval (13), view events (10/11), DOM events (11/12/13), row listeners die with cleared containers (8). ✓

**Type consistency check:** `VirClient.query/doctor`, `VirSettings` field names, plugin methods (`refreshClient`, `restartStatusPolling`, `openSettings`, `surfaceRelated`/`activateView`), view methods (`focusRelatedAndRefresh`), tab methods (`mount`/`unmount`/`forceRefresh`/`render`), `VIR_VIEW_TYPE`, `resolveDaemonStatus` return shape (`{cls, tooltip}`), and `RowData` are referenced consistently across Tasks 1–13. The `MarkdownView` stray import in Task 10 Step 1 is corrected in Step 1's "Corrected import line".

**Known follow-ups flagged in-plan (not blockers):** real screenshot before submission; decide whether to track `main.js` in git (recommend not — workflow rebuilds it); `-rc` prerelease flag in workflow if you want RC tags marked prerelease.
