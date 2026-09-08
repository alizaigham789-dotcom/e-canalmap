// HTML-escape a value for safe interpolation into HTML strings (document.write,
// innerHTML, template literals). Coerces non-strings to string. Returns "" for
// null/undefined so `${escapeHtml(x)}` never renders "null"/"undefined".
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}