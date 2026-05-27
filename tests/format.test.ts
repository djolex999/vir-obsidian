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
