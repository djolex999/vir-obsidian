#!/usr/bin/env node
process.stdout.write(JSON.stringify({ error: "vir daemon unreachable", kind: "daemon_down" }));
process.stderr.write("boom\n");
process.exit(1);
