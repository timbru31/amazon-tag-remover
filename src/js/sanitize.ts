// Keep in sync with the host_permissions in src/manifest.json
export const amazonDomains = [
  "ae",
  "at",
  "ca",
  "ch",
  "cn",
  "co.jp",
  "co.uk",
  "co.za",
  "com.au",
  "com.be",
  "com.br",
  "com.mx",
  "com.sg",
  "com.tr",
  "com",
  "de",
  "dk",
  "eg",
  "es",
  "fr",
  "ie",
  "in",
  "it",
  "mx",
  "nl",
  "nz",
  "pl",
  "pt",
  "sa",
  "se",
  "sg",
  "us",
];

// The dots of the multi-part TLDs (co.jp, com.au, ...) are escaped so hosts
// like amazon.comx do not match, and `([a-z0-9-]+\.)*` requires a proper
// subdomain label before "amazon" so m.media-amazon.com does not match, while
// www.amazon.de and amazon.de do.
const AMAZON_HOST_PATTERN = new RegExp(
  `^([a-z0-9-]+\\.)*amazon\\.(${amazonDomains.map((domain) => domain.replaceAll(".", "\\.")).join("|")})$`,
  "u",
);

// Amazon tracking IDs look like "name-21"; restrict to URL-safe characters so the
// value can be used in a query parameter and a regexFilter without escaping issues.
const REPLACEMENT_TAG_PATTERN = /^[\w.~-]+$/u;

/** Returns the trimmed replacement tag, or an empty string when it is unset or invalid. */
export function normalizeReplacementTag(replacementTag: unknown): string {
  if (typeof replacementTag !== "string") {
    return "";
  }
  const trimmed = replacementTag.trim();
  return REPLACEMENT_TAG_PATTERN.test(trimmed) ? trimmed : "";
}

/** True when the path ends with a `/ref=...` segment, as produced by Amazon referrals. */
export function hasTrailingRefSegment(pathname: string): boolean {
  return /\/ref=[^/?]+$/u.test(pathname);
}

export interface SanitizeOptions {
  aggressiveMode: boolean;
  allowedTags: string[];
  replacementTag: string;
}

export interface SanitizeResult {
  /** The URL to put on the clipboard. */
  url: string;
  /** True when the URL differs from the input (a tag was removed or replaced, or aggressive cleaning removed something). */
  changed: boolean;
}

/**
 * Strip the affiliate tracking tag from an Amazon URL, mirroring what the DNR
 * rules do on navigation (rules.json plus the dynamic rules in background.ts):
 *
 * - a URL carrying an allowed tag (or the replacement tag) is returned
 *   unchanged — the allow rules (highest priority) leave such URLs untouched;
 * - normal mode removes the `tag` and `ascsubtag` parameters;
 * - aggressive mode removes every query parameter and a trailing `/ref=...`
 *   path segment;
 * - when a replacement tag is configured, a foreign tag is replaced by it,
 *   but a URL without a foreign tag is never tagged: copying a clean link
 *   yields a clean link, even though the DNR replacement rule also adds the
 *   tag to tag-less navigations.
 *
 * Returns null when the input is not an Amazon URL.
 */
export function sanitizeAmazonUrl(input: string, options: SanitizeOptions): SanitizeResult | null {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  if (!AMAZON_HOST_PATTERN.test(parsed.hostname)) {
    return null;
  }

  // getAll() covers repeated params (e.g. ?tag=a&tag=b) and keeps the values
  // that the static removeParams rule in rules.json strips.
  const tags = [...parsed.searchParams.getAll("tag"), ...parsed.searchParams.getAll("ascsubtag")];
  const keptTags = new Set([...options.allowedTags, ...(options.replacementTag ? [options.replacementTag] : [])]);
  if (tags.some((tag) => keptTags.has(tag))) {
    return { url: input, changed: false };
  }
  const hasForeignTag = tags.length > 0;

  const url = new URL(input);
  let changed: boolean;
  if (options.aggressiveMode) {
    // Mirrors createAggressiveUrlRule: every query parameter and the trailing
    // /ref=... path segment are removed.
    url.search = "";
    const refSegment = /\/ref=[^/?]+$/u.exec(url.pathname);
    if (refSegment) {
      url.pathname = url.pathname.slice(0, refSegment.index);
    }
    changed = hasTrailingRefSegment(parsed.pathname) || parsed.searchParams.size > 0;
  } else {
    url.searchParams.delete("tag");
    url.searchParams.delete("ascsubtag");
    changed = hasForeignTag;
  }
  if (options.replacementTag && hasForeignTag) {
    url.searchParams.set("tag", options.replacementTag);
  }
  return { url: url.toString(), changed };
}
