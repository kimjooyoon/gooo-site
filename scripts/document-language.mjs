const supportedLanguages = new Set(['en', 'ko']);

// This is the site's bounded metadata policy, not a full HTML or accessibility audit.
export function hasSupportedDocumentLanguage(html) {
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  const root = source.match(/<html(?=[\s>])((?:[^"'<>]|"[^"]*"|'[^']*')*)>/i);
  if (!root) return false;
  const attributes = [...root[1].matchAll(/(?:^|\s)([^\s"'=<>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>]+))?/g)];
  const languages = attributes.filter(([, name]) => name.toLowerCase() === 'lang');
  if (languages.length !== 1) return false;
  const value = languages[0][2] ?? '';
  const language = /^["']/.test(value) ? value.slice(1, -1) : value;
  return supportedLanguages.has(language.toLowerCase());
}
