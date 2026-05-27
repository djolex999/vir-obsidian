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
		expect(buildQueryText("My Note", body, 20)).toBe("My Note\n\nFirst line. Second l");
	});
	it("caps body at maxBodyChars (default 200)", () => {
		const body = "x".repeat(500);
		const out = buildQueryText("T", body);
		expect(out).toBe(`T\n\n${"x".repeat(200)}`);
	});
});
