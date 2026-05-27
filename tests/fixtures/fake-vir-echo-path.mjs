#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, delimiter } from "path";

const selfDir = dirname(fileURLToPath(import.meta.url));
const present = (process.env.PATH || "").split(delimiter).includes(selfDir);

process.stdout.write(
	JSON.stringify([
		{
			path: present ? "DIR_IN_PATH" : "DIR_MISSING",
			score: 0,
			category: "tool",
			confidence: 1,
			preview: "",
		},
	]),
);
process.exit(0);
