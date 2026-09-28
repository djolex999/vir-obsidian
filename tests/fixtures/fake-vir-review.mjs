#!/usr/bin/env node
const args = process.argv.slice(2);
const fail = (kind, error) => {
	process.stderr.write(JSON.stringify({ error, kind }) + "\n");
	process.exit(1);
};
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

if (args.includes("--audited")) {
	process.stdout.write(
		JSON.stringify({
			items: [
				{ path: "gotchas/b.md", sessionId: "b", title: "B", category: "gotcha", project: null, date: "2026-09-01", confidence: 0.6, verdict: "reject", reason: "noise", mergeInto: null, auditedAt: "2026-09-26" },
			],
			counts: { unaudited: 3, stale: 1 },
		}),
	);
	process.exit(0);
}
for (const action of ["approve", "reject", "restore"]) {
	const target = flag(action);
	if (target === undefined) continue;
	if (target.includes("BUSY")) fail("busy", "another vir process (pid 1) is already running the pipeline");
	if (target.includes("GONE")) fail("not_found", `no note at ${target}`);
	const path = action === "reject" ? `.rejected/${target.split("/").pop()}` : target;
	process.stdout.write(JSON.stringify({ action, path, sessionId: "sid" }));
	process.exit(0);
}
fail("invalid_args", `unexpected argv: ${JSON.stringify(args)}`);
