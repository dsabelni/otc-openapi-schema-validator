import { marked } from "marked";
import yaml from "js-yaml";

export const convertMarkdownToPlainText = (markdown: string) => {
    try {
        // Use marked to get HTML, then convert to plain text.
        const html = marked(markdown ?? "");
        // If running on the server (no DOM), strip tags and decode a few entities.
        if (typeof document === "undefined") {
            const stripped = String(html).replace(/<[^>]*>/g, "");
            return stripped
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, " ")
              .trim();
        }
        // Browser path: use a temporary DOM node to get text content.
        const tempDiv = document.createElement("div");
        if (typeof html === "string") {
            tempDiv.innerHTML = html;
        }
        const text = tempDiv.textContent || tempDiv.innerText || "";
        return text.replace(/\s+/g, " ").trim();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        // Fallback: basic markdown stripping without DOM
        return String(markdown ?? "")
          // remove inline and fenced code
          .replace(/```[\s\S]*?```/g, " ")
          .replace(/`[^`]*`/g, " ")
          // images ![alt](url)
          .replace(/!\[[^\]]*\]\([^\)]+\)/g, " ")
          // links [text](url) -> text
          .replace(/\[([^\]]*)\]\([^\)]+\)/g, "$1")
          // headers, formatting markers
          .replace(/^\s{0,3}#{1,6}\s+/gm, "")
          .replace(/[>*_~\-]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
    }
};

export const convertImageFromLinkToBase64 = async (imageUrl: string): Promise<string> => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export async function fetchRepoMap(spec: any): Promise<Record<string, string> | null> {
    try {
        const response = await fetch('/gitea/repositories.yaml');
        const text = await response.text();

        const parsed = yaml.load(text) as { services: Record<string, string>[] };
        const serviceEntry = parsed.services.find((entry) => Object.keys(entry).includes(spec.info.title));
        return serviceEntry ?? null;
    } catch (e) {
        console.error("Failed to load repositories.yaml:", e);
        return null;
    }
}

export async function fetchSpecFromGitea(repo: string, path: string): Promise<any | null> {
    try {
        const response = await fetch(`/api/gitea?repo=${repo}&path=${path}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch YAML');
        return data.yaml;
    } catch (error) {
        console.error("Failed to fetch spec YAML from gitea portal:", error);
        return null;
    }
}
