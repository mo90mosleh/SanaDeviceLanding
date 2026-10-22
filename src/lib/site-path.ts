const base = import.meta.env.BASE_URL || "/";
const staticSite = import.meta.env["VITE_STATIC_SITE"] === "true";

export function assetPath(path: string) {
  return `${base}${path.replace(/^\/+/, "")}`;
}

export function pagePath(path = "/") {
  const separator = path.search(/[?#]/u);
  const pathname = separator < 0 ? path : path.slice(0, separator);
  const suffix = separator < 0 ? "" : path.slice(separator);
  const normalized = staticSite && !pathname.endsWith("/") ? `${pathname}/` : pathname;
  return assetPath(normalized) + suffix;
}
