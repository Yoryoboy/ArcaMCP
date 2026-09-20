# Release 1.1.1

## Goal

Publish the latest `main` changes as npm patch release `@yoryoboy/arcamcp@1.1.1`.

## Tasks

- [x] Bump package metadata to 1.1.1 (`c828600`).
- [x] Verify quality checks and package contents (295 tests passed; dry-run clean).
- [ ] Merge the release commit, publish to npm, and verify the registry result.

## Evidence

- Source baseline: `4455e40` (`origin/main`)
- Existing npm version: `1.1.0`
- Release branch: `release/1.1.1`
- Version bump commit: `c828600`
- Verification: `pnpm run quality` and `npm pack --dry-run` passed; 295/295 tests passed.
