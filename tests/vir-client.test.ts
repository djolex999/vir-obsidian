import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { VirClient, VirNotFoundError, VirTimeoutError, VirCLIError } from "../src/vir-client";

const fx = (name: string): string => resolve(__dirname, "fixtures", name);

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
		const err = await client.query("hi", 3).catch((e: unknown) => e);
		expect(err).toBeInstanceOf(VirCLIError);
		expect((err as VirCLIError).message).toBe("vir daemon unreachable");
		expect((err as VirCLIError).exitCode).toBe(1);
	});

	it("throws VirCLIError on unparseable JSON", async () => {
		const client = new VirClient(fx("fake-vir-badjson.mjs"));
		await expect(client.doctor()).rejects.toBeInstanceOf(VirCLIError);
	});

	it("throws VirTimeoutError when the call exceeds the timeout", async () => {
		const client = new VirClient(fx("fake-vir-slow.mjs"), { queryTimeoutMs: 100 });
		await expect(client.query("hi", 3)).rejects.toBeInstanceOf(VirTimeoutError);
	});

	it("prepends the binary's own directory to PATH (so node-shebang CLIs resolve)", async () => {
		const client = new VirClient(fx("fake-vir-echo-path.mjs"));
		const results = await client.query("hi", 1);
		expect(results[0].path).toBe("DIR_IN_PATH");
	});
});
