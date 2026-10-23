const repository = process.env.GITHUB_REPOSITORY || "mo90mosleh/SanaDeviceLanding";
const [owner, name] = repository.split("/");

export const pagesBase = process.env.SANA_BASE_PATH || `/${name}/`;
export const pagesUrl = new URL(pagesBase, `https://${owner.toLowerCase()}.github.io`).href;
