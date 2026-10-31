/**
 * Domain normalization and validation utilities for Do Not Disturb
 */

export interface NormalizedDomain {
  raw: string;
  hostname: string;
  isValid: boolean;
  error?: string;
}

// Protected domains that should never be blocked to prevent breaking essential services or the app itself
const PROTECTED_DOMAINS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "chrome",
  "chrome-extension",
  "edge",
  "brave",
  "mozilla",
  "vercel.app",
  "donotdistrb.com",
  "donotdisturb.com",
]);

/**
 * Normalizes user input into a clean hostname.
 * Handles inputs like:
 * - "https://www.youtube.com/watch?v=123" -> "youtube.com" (or "www.youtube.com" if keepWww is true)
 * - "reddit.com/" -> "reddit.com"
 * - "HTTP://X.COM" -> "x.com"
 */
export function normalizeDomain(input: string, stripWww = true): NormalizedDomain {
  const raw = input.trim();
  if (!raw) {
    return { raw, hostname: "", isValid: false, error: "Domain cannot be empty" };
  }

  let working = raw.toLowerCase();

  // Strip protocol if present
  if (working.startsWith("http://")) {
    working = working.slice(7);
  } else if (working.startsWith("https://")) {
    working = working.slice(8);
  }

  // Strip path, query, hash
  const slashIdx = working.indexOf("/");
  if (slashIdx !== -1) {
    working = working.slice(0, slashIdx);
  }
  const questIdx = working.indexOf("?");
  if (questIdx !== -1) {
    working = working.slice(0, questIdx);
  }
  const hashIdx = working.indexOf("#");
  if (hashIdx !== -1) {
    working = working.slice(0, hashIdx);
  }

  // Strip port if present
  const colonIdx = working.indexOf(":");
  if (colonIdx !== -1) {
    working = working.slice(0, colonIdx);
  }

  // Strip wildcard prefix if user entered *.example.com
  if (working.startsWith("*.")) {
    working = working.slice(2);
  }

  // Optionally strip leading 'www.'
  if (stripWww && working.startsWith("www.")) {
    working = working.slice(4);
  }

  working = working.trim();

  // Validate hostname format using standard domain regex
  // Each label 1-63 chars, letters, digits, hyphens (not at ends), TLD at least 2 chars
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
  
  if (!domainRegex.test(working)) {
    return {
      raw,
      hostname: working,
      isValid: false,
      error: "Please enter a valid domain (e.g. youtube.com or reddit.com)",
    };
  }

  // Check against protected list
  if (isProtectedDomain(working)) {
    return {
      raw,
      hostname: working,
      isValid: false,
      error: `'${working}' is a system-protected domain and cannot be blocked.`,
    };
  }

  return {
    raw,
    hostname: working,
    isValid: true,
  };
}

/**
 * Checks if a domain is on the protected list
 */
export function isProtectedDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  for (const protectedHost of PROTECTED_DOMAINS) {
    if (lower === protectedHost || lower.endsWith(`.${protectedHost}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Formats declarativeNetRequest urlFilter for a domain.
 * Example:
 * - domain="youtube.com", includeSubdomains=true  => "||youtube.com^"
 * - domain="youtube.com", includeSubdomains=false => "|https://youtube.com/|"
 */
export function createDnrFilter(domain: string, includeSubdomains: boolean): string {
  const clean = domain.toLowerCase().replace(/^www\./, "");
  if (includeSubdomains) {
    // Matches http://youtube.com/, https://www.youtube.com/, https://sub.youtube.com/
    return `||${clean}^`;
  }
  // Matches exact hostname root path
  return `|https://${clean}/|`;
}
