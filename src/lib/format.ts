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
