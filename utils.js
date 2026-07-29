/**
 * Small, dependency-free helpers shared across the app: HTML escaping,
 * safe URL handling and a Markdown-ish renderer used for AI output.
 *
 * Security note: any text that ends up inside innerHTML MUST go through
 * escapeHtml() first. formatMarkdown()/inlineMarkdown() escape their input
 * internally, so callers should NOT escape twice before calling them.
 */

/**
 * Escapes the five HTML-significant characters so a string can be safely
 * placed inside innerHTML as plain text.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns a safe href for use in an <a> tag: only http(s)/mailto links pass
 * through untouched, everything else (javascript:, data:, vbscript:, plain
 * garbage, etc.) is rejected. Returns null when the value should not be
 * rendered as a clickable link at all.
 */
export function sanitizeUrl(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  // Bare domains/paths without a scheme are treated as https://
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:") {
      return url.href;
    }
  } catch (_) {
    // fall through
  }
  return null;
}

/**
 * Renders a value as a safe <a> tag if possible, otherwise as escaped plain
 * text. Used everywhere we display a user- or AI-supplied "website" field.
 */
export function renderSafeLink(value, displayText) {
  const text = escapeHtml(displayText ?? value ?? "-");
  const safeHref = sanitizeUrl(value);
  if (!safeHref) return text;
  return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-cyan); text-decoration: none;">${text}</a>`;
}

/**
 * A clean, lightweight, and safe Markdown formatter that supports headers,
 * bold, lists, blockquotes, copy actions, and custom score badges.
 * All raw text content is escaped before any markup is added, so untrusted
 * text (AI output, scraped websites, user input) cannot inject HTML/JS.
 */
export function formatMarkdown(md) {
  if (!md) return "<p>Keine Daten verfügbar.</p>";

  let lines = md.split("\n");
  let html = [];
  let inList = false;
  let inBlockquote = false;
  let blockquoteBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmed = line.trim();

    // Handle blockquotes
    if (trimmed.startsWith(">")) {
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteBuffer = [];
      }
      let quoteText = line.replace(/^\s*>\s?/, "");
      blockquoteBuffer.push(quoteText);
      continue;
    } else if (inBlockquote) {
      html.push(renderBlockquote(blockquoteBuffer.join("\n")));
      inBlockquote = false;
      blockquoteBuffer = [];
    }

    // Handle lists
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      let content = trimmed.substring(2);
      html.push(`<li>${inlineMarkdown(content)}</li>`);
      continue;
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
    }

    // Skip module markers
    if (trimmed.startsWith("===MODULE") || trimmed.startsWith("===EMAIL") || trimmed.startsWith("===QUESTIONS") || trimmed.startsWith("===OBJECTIONS") || trimmed.startsWith("===FOLLOWUP")) {
      continue;
    }

    // Headers
    if (trimmed.startsWith("#### ")) {
      html.push(`<h4>${inlineMarkdown(trimmed.substring(5))}</h4>`);
    } else if (trimmed.startsWith("### ")) {
      html.push(`<h3>${inlineMarkdown(trimmed.substring(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      html.push(`<h2>${inlineMarkdown(trimmed.substring(3))}</h2>`);
    }
    // Empty lines
    else if (trimmed === "") {
      continue;
    }
    // Paragraphs
    else {
      // Detect Brauchbarkeits-Score format
      if (trimmed.toLowerCase().includes("brauchbarkeits-score")) {
        const scoreMatch = trimmed.match(/brauchbarkeits-score\s*(?:\([^)]+\))?:\s*([0-9.,]+)\s*\/\s*10/i);
        if (scoreMatch) {
          const scoreValue = escapeHtml(scoreMatch[1]);
          const remainingText = trimmed.replace(scoreMatch[0], "").replace(/^[\s-*,.:;]+/, "");

          html.push(`
            <div style="margin-bottom: 1.5rem;">
              <div class="score-badge">${scoreValue}<span class="max">/10</span></div>
              ${remainingText ? `<p style="margin-top: 0.5rem;">${inlineMarkdown(remainingText)}</p>` : ""}
            </div>
          `);
          continue;
        }
      }

      html.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }

  // Close open structures
  if (inBlockquote) {
    html.push(renderBlockquote(blockquoteBuffer.join("\n")));
  }
  if (inList) {
    html.push("</ul>");
  }

  return html.join("\n");
}

/**
 * Escapes the raw text first, then applies a tiny subset of inline Markdown
 * (bold/italic) on top of the already-escaped text.
 */
export function inlineMarkdown(text) {
  let escaped = escapeHtml(text);
  let formatted = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  formatted = formatted.replace(/_([^_]+)_/g, "<em>$1</em>");
  return formatted;
}

/**
 * Formats blockquotes (used for outreach email templates etc.)
 */
export function renderBlockquote(text) {
  const cleanText = escapeHtml(text.trim());

  return `
    <div class="blockquote-wrapper">
      <button class="blockquote-copy-btn" data-clipboard="${cleanText}">
        <i data-lucide="copy" style="width: 14px; height: 14px;"></i> Kopieren
      </button>
      <blockquote>
        ${text.split("\n").map(line => `<p>${inlineMarkdown(line)}</p>`).join("")}
      </blockquote>
    </div>
  `;
}

/**
 * SHA-256 hash of a string, returned as a hex string. Used for the optional
 * Setup-lock PIN. IMPORTANT: this is NOT a real access-control mechanism -
 * see the note next to the Admin-PIN field in the Settings UI. Anyone with
 * DevTools access to the page can read localStorage or step over the check.
 * It only exists to stop a colleague from casually clicking into Setup.
 */
export async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
