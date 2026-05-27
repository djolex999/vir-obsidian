const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function stripFrontmatter(content: string): string {
	return content.replace(FRONTMATTER_RE, "");
}

export function buildQueryText(title: string, body: string, maxBodyChars = 200): string {
	const snippet = stripFrontmatter(body).trim().slice(0, maxBodyChars);
	return `${title}\n\n${snippet}`.trim();
}
