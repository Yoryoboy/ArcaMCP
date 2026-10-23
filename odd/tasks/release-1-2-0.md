# Release 1.2.0

## Goal

Publish `feat/onboarding-cli-and-annotations` (lazy validated config, `setup`/`doctor` CLI, MCP tool annotations) as npm minor release `@yoryoboy/arcamcp@1.2.0`.

## Tasks

- [x] Bump package metadata to 1.2.0.
- [x] Verify quality checks and package contents (367 tests passed; dry-run excludes tests and fixtures).
- [x] Merge the PR, publish to npm from `main`, tag `v1.2.0` and verify the registry result.

## Evidence

- Existing npm version: `1.1.1`
- Feature branch: `feat/onboarding-cli-and-annotations`
- Release commit: `174f8ab` (`chore(release): prepare 1.2.0`)
- Pull request: #8, merged into `main` as `8debe1c`; feature branch deleted.
- Published package: `@yoryoboy/arcamcp@1.2.0` with npm dist-tag `latest` (visible after ~1.5 minutes).
- Tag: `v1.2.0` → `8debe1c`.
- Registry verification in an empty directory: `npx -y @yoryoboy/arcamcp@1.2.0 help` prints the new help; `doctor` lists missing configuration and exits 1.
- Not verified: `setup` and `doctor` against a real ARCA account.
