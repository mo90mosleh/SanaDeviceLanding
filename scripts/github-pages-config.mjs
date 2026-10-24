export function resolvePagesConfig({
  repository = "mo90mosleh/SanaDeviceLanding",
  siteUrl,
  basePath,
} = {}) {
  const [owner, name] = repository.split("/");
  const site = new URL(siteUrl || `https://${owner.toLowerCase()}.github.io/${name}/`);
  const path = (basePath ?? site.pathname).replace(/^\/+|\/+$/gu, "");
  const pagesBase = path ? `/${path}/` : "/";
  return { pagesBase, pagesUrl: new URL(pagesBase, site.origin).href };
}

export const { pagesBase, pagesUrl } = resolvePagesConfig({
  repository: process.env.GITHUB_REPOSITORY,
  siteUrl: process.env.SANA_SITE_URL,
  basePath: process.env.SANA_BASE_PATH,
});
