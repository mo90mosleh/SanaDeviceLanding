# GitHub Pages publication

The target after the repository rename is https://mo90mosleh.github.io/SanaDeviceLanding/ from main.

Release c31fb2e30160335a665302f974200f85d0da8577 passed the existing build, typecheck, unit tests, route checks, 36 responsive browser reviews, static-export checks and the real webhook CORS preflight. Full lint retains one pre-existing formatting error and six existing warnings; the baseline regression check reports no introduced findings.

The Pages deployment succeeded after the repository owner enabled GitHub Actions as the Pages source. The separate live-delivery workflow is being run once against the published homepage with an unmistakably labelled synthetic lead. Its Actions result records the webhook HTTP acknowledgement, success message and cleared inputs; downstream n8n completion is outside that check.

## Repository rename

The Pages workflow derives its base path from the repository name. Export and browser review share `scripts/github-pages-config.mjs`; the explicit rename-preview branch validates `/SanaDeviceLanding/` before changing repository settings. Standard main builds continue to use the current repository name until the owner renames it. After renaming to `SanaDeviceLanding`, trigger a fresh push or workflow dispatch so GitHub supplies the new repository context and republishes all six pages under the new path.

The owner needs to perform only Settings → General → Repository name → Rename because the connected GitHub toolset does not expose repository administration/rename. No form endpoint or form field is changed by this migration.
