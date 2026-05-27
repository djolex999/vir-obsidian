#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("doctor")) {
	process.stdout.write(
		JSON.stringify({
			daemon: "ok",
			lastPollAt: "2026-05-27T11:59:00.000Z",
			lastDistillAt: "2026-05-27T10:00:00.000Z",
			dbSizeMb: 2.65,
			vaultPath: "/tmp/Vir",
			configValid: true,
			ollama: { reachable: true, model: "nomic-embed-text" },
			version: "0.7.1",
		}),
	);
} else if (args.includes("query")) {
	process.stdout.write(
		JSON.stringify([
			{ path: "a.md", score: 0.55, category: "decision", confidence: 0.72, preview: "A", project: "x", date: "2026-03-15T12:05:28.772Z" },
			{ path: "b.md", score: 0.51, category: "gotcha", confidence: 0.95, preview: "B", project: "y", date: "2026-05-14T23:51:03.250Z" },
			{ path: "c.md", score: 0.52, category: "tool", confidence: 0.9, preview: "C" },
		]),
	);
}
process.exit(0);
