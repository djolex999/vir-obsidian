import { spawn } from "child_process";
import { dirname, isAbsolute, delimiter } from "path";
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
		if (
			parsed &&
			typeof parsed === "object" &&
			typeof (parsed as VirErrorPayload).error === "string"
		) {
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
			const finish = (fn: () => void): void => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				fn();
			};

			// GUI-launched Obsidian has a minimal PATH. The resolved binary is typically a
			// node-shebang script (e.g. nvm: vir -> cli.js with `#!/usr/bin/env node`), so the
			// child needs `node` — which lives beside the binary — on PATH. Prepend its dir.
			const env = isAbsolute(this.binaryPath)
				? { ...process.env, PATH: `${dirname(this.binaryPath)}${delimiter}${process.env.PATH ?? ""}` }
				: process.env;
			const child = spawn(this.binaryPath, args, { env });

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

const DETECT_MARKER = "__VIR_BIN__";
const DETECT_TIMEOUT_MS = 8_000;

/**
 * Resolve an absolute path to the vir binary. GUI-launched apps (Obsidian from the Dock)
 * have a minimal PATH that omits nvm/asdf. On POSIX we run an *interactive login* shell
 * (`-i -l -c`) so `~/.zshrc`/`~/.bashrc` — where nvm/asdf init lives — gets sourced; a plain
 * login shell does not source those. Output is sentinel-wrapped so noisy shell startup
 * (themes, instant prompt) can't pollute the parsed path. Best-effort; null on any failure.
 */
export function detectVirBinary(): Promise<string | null> {
	if (process.platform === "win32") {
		return runDetect("where.exe", ["vir"]).then((out) => firstLine(out));
	}
	const shell = process.env.SHELL || "/bin/zsh";
	const probe = `printf '${DETECT_MARKER}%s\\n' "$(command -v vir 2>/dev/null)"`;
	return runDetect(shell, ["-i", "-l", "-c", probe]).then((out) => {
		const line = out.split("\n").find((l) => l.includes(DETECT_MARKER));
		if (!line) return null;
		const found = line.slice(line.indexOf(DETECT_MARKER) + DETECT_MARKER.length).trim();
		return found.length > 0 ? found : null;
	});
}

function firstLine(out: string): string | null {
	const line = out
		.split(/\r?\n/)
		.map((l) => l.trim())
		.find((l) => l.length > 0);
	return line ?? null;
}

/** Spawn a detection command and resolve with whatever it printed to stdout (empty on failure). */
function runDetect(cmd: string, args: string[]): Promise<string> {
	return new Promise((resolvePromise) => {
		let child: ReturnType<typeof spawn>;
		try {
			child = spawn(cmd, args);
		} catch {
			resolvePromise("");
			return;
		}
		let out = "";
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			resolvePromise(out);
		}, DETECT_TIMEOUT_MS);
		child.stdout?.on("data", (c: Buffer) => (out += c.toString()));
		child.on("error", () => {
			clearTimeout(timer);
			resolvePromise("");
		});
		child.on("close", () => {
			clearTimeout(timer);
			resolvePromise(out);
		});
	});
}
