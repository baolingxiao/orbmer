/**
 * Lightweight word-level diff for AI preview (no heavy editor dependency).
 */

function tokenize(text) {
  return String(text || "")
    .split(/(\s+|[,.!?;:，。！？；：、])/u)
    .filter((part) => part.length > 0);
}

/**
 * @returns {{ type: 'equal'|'add'|'del', text: string }[]}
 */
export function wordDiff(before, after) {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      parts.push({ type: "equal", text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      parts.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      parts.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    parts.push({ type: "del", text: a[i] });
    i += 1;
  }
  while (j < m) {
    parts.push({ type: "add", text: b[j] });
    j += 1;
  }
  return parts;
}

export function renderDiffHtml(before, after) {
  return wordDiff(before, after)
    .map((part) => {
      const escaped = escapeHtml(part.text);
      if (part.type === "add") return `<ins class="ai-diff-add">${escaped}</ins>`;
      if (part.type === "del") return `<del class="ai-diff-del">${escaped}</del>`;
      return `<span>${escaped}</span>`;
    })
    .join("");
}

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function hashValue(value) {
  const text = String(value ?? "");
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);
  }
  // Fallback (non-crypto) for older environments
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return `f${h.toString(16).padStart(8, "0")}`;
}
