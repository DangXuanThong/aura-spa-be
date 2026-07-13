const PHONE_RE = /(?:\+?84|0)\d{8,10}\b/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function redactPii(text: string): string {
  if (!text) return text;
  return text.replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]');
}

export function clampText(text: string, max = 500): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}
