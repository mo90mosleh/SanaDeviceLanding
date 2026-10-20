export const utmKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
export type Attribution = Partial<Record<(typeof utmKeys)[number], string>>;
const storageKey = "sana:attribution:v1";
export function captureAttribution(
  search: string,
  storage?: Pick<Storage, "getItem" | "setItem">,
): Attribution {
  let saved: Attribution = {};
  try {
    const parsed = JSON.parse(storage?.getItem(storageKey) || "{}");
    for (const key of utmKeys) {
      if (typeof parsed?.[key] === "string") saved[key] = parsed[key].slice(0, 200);
    }
  } catch {
    /* Storage may be unavailable. */
  }
  const params = new URLSearchParams(search);
  // A new campaign replaces the previous campaign, avoiding mixed attribution.
  if (utmKeys.some((key) => params.has(key))) {
    saved = {};
    for (const key of utmKeys) {
      const value = params.get(key)?.trim();
      if (value) saved[key] = value.slice(0, 200);
    }
  }
  try {
    storage?.setItem(storageKey, JSON.stringify(saved));
  } catch {
    /* In-memory attribution remains usable. */
  }
  return saved;
}
let current: Attribution = {};
export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    current = captureAttribution(window.location.search, window.sessionStorage);
  } catch {
    current = { ...current, ...captureAttribution(window.location.search) };
  }
  return { ...current };
}
