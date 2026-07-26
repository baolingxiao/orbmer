import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const journalRoot = path.join(projectRoot, "content", "journal");
const issuesRoot = path.join(projectRoot, "content", "issues");

export function isTinaJournalEnabled() {
  return String(process.env.TINA_JOURNAL_ENABLED || "false").trim().toLowerCase() === "true";
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function listFiles(dir, extension) {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch {
    return [];
  }
}

function coerceScalar(value) {
  const text = String(value ?? "").trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text.replace(/^["']|["']$/g, "");
}

function parseFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/m.exec(source);
  if (!match) return { data: {}, body: source };
  const data = {};
  const lines = match[1].split(/\r?\n/);
  let activeKey = "";
  for (const line of lines) {
    if (!line.trim()) continue;
    const listMatch = /^\s+-\s+(.*)$/.exec(line);
    if (listMatch && activeKey) {
      if (!Array.isArray(data[activeKey])) data[activeKey] = [];
      data[activeKey].push(coerceScalar(listMatch[1]));
      continue;
    }
    const pair = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!pair) continue;
    activeKey = pair[1];
    const raw = pair[2];
    if (raw === "") {
      data[activeKey] = [];
    } else {
      data[activeKey] = coerceScalar(raw);
    }
  }
  return { data, body: match[2].trim() };
}

function bodyFallback(markdown) {
  return String(markdown || "")
    .split(/\n{2,}/)
    .map((part) =>
      part
        .replace(/^>\s*/gm, "")
        .replace(/^#+\s*/gm, "")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 8);
}

function articleFromFile(filePath) {
  const source = readText(filePath);
  if (!source) return null;
  const { data, body } = parseFrontmatter(source);
  const slug = path.basename(filePath).replace(/\.mdx?$/, "");
  const bodyText = bodyFallback(body);
  return {
    id: data.id || slug,
    slug,
    titleZh: data.titleZh || data.title || slug,
    titleEn: data.titleEn || data.title || data.titleZh || slug,
    category: data.category || "lifestyle",
    categoryZh: data.categoryZh || "",
    categoryEn: data.categoryEn || "",
    coverImage: data.coverImage || data.image || "/assets/editorial/designer-atelier.jpg",
    image: data.coverImage || data.image || "/assets/editorial/designer-atelier.jpg",
    excerptZh: data.excerptZh || bodyText[0] || "",
    excerptEn: data.excerptEn || data.excerptZh || bodyText[0] || "",
    authorZh: data.authorZh || "Orbmare 编辑部",
    authorEn: data.authorEn || "Orbmare Editors",
    publishedAt: String(data.publishedAt || "2026-07-26").slice(0, 10),
    readingTime: Number(data.readingTime || 5),
    requiresMembership: data.requiresMembership !== false,
    issue: data.issue || "issue-01",
    collection: data.collection || "quiet-luxury",
    relatedProductIds: Array.isArray(data.relatedProductIds) ? data.relatedProductIds : [],
    bodyZh: Array.isArray(data.bodyZh) && data.bodyZh.length ? data.bodyZh : bodyText,
    bodyEn: Array.isArray(data.bodyEn) && data.bodyEn.length ? data.bodyEn : bodyText,
    source: "tina",
  };
}

export function listTinaJournalArticles() {
  if (!isTinaJournalEnabled()) return [];
  return listFiles(journalRoot, ".mdx").map(articleFromFile).filter(Boolean);
}

export function listTinaJournalIssues() {
  if (!isTinaJournalEnabled()) return [];
  return listFiles(issuesRoot, ".json")
    .map((filePath) => {
      try {
        const issue = JSON.parse(readText(filePath));
        return {
          ...issue,
          id: issue.id || issue.issueId || path.basename(filePath).replace(/\.json$/, ""),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function mergeTinaJournalContent(content) {
  if (!isTinaJournalEnabled()) return content;
  const articles = listTinaJournalArticles();
  const issues = listTinaJournalIssues();
  if (!articles.length && !issues.length) return content;
  return {
    ...content,
    journal: {
      ...(content.journal || {}),
      ...(articles.length ? { items: articles } : {}),
      ...(issues.length ? { issues } : {}),
      source: "tina",
    },
  };
}
