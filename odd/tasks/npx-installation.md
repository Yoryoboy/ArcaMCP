# npx installation

## Goal

Document npm/npx installation and migrate the Hermes ArcaMCP launcher from a local build to the published npm package.

## Tasks

- [x] Update README installation and MCP client examples to use `npx`.
- [x] Update `yoryo:~/.hermes/config.yaml` to launch ArcaMCP through `npx`.
- [x] Verify documentation, remote YAML syntax, and the npx launcher.

## Evidence

- Local branch: `docs/npx-installation`
- Current Hermes launcher: `node /home/yoryo/apps/ArcaMCP/dist/index.js`
- Target package: `@yoryoboy/arcamcp@latest`
- Remote backup: `~/.hermes/backups/config/config.yaml.pre-arcamcp-npx.20260920T164810Z`
- Verification: Prettier, build, package prepack, 295 tests, Hermes config parsing, and bounded remote startup smoke passed.
