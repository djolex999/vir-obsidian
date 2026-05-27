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

		let child: ReturnType<typeof spawn>;
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

		child.stdout?.on("data", (c: Buffer) => (out += c.toString()));
		child.on("error", () => {
			clearTimeout(timer);
			resolvePromise(null);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			const first = out
				.split("\n")
				.map((l) => l.trim())
				.find((l) => l.length > 0);
			resolvePromise(code === 0 && first ? first : null);
		});
	});
}
