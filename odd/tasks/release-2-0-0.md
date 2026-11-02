# Release 2.0.0

## Goal

Publish the dependency refresh, Node 22 baseline, serverInfo fix, catalog cache and structured
output (PRs #9-#16) as npm major release `@yoryoboy/arcamcp@2.0.0`.

## Specs

- S1: "empecemos con los push para hacer la release" — merge #9-#16, publish 2.0.0 to npm from
  `main`, tag `v2.0.0`, verify the registry result.
- S2: Version 2.0.0 (user decision): breaking for consumers — `engines.node` raised from >=20 to
  >=22, server announced as `arcamcp` instead of `MonotributoMCP`, `tools/list` JSON Schemas and
  Zod validation wording change, every tool publishes an `outputSchema`.

## Tasks

- [x] Merge #9-#16 into `main` in order.
- [x] Bump package metadata to 2.0.0; quality on Node 22 and 26; package dry-run.
- [x] Publish to npm from `main`, tag `v2.0.0`, verify with `npx` in an empty directory.

## Log

- L1 (user): "empecemos con los push para hacer la release"; version 2.0.0 chosen.
- L2 (incident): merging #9 with `--delete-branch` deleted `chore/dependency-refresh`, and GitHub
  closed #10 (based on it) instead of retargeting it. Recovered by restoring the branch at
  `1425325`, reopening #10 and retargeting it to `main` (same 12 files). The remaining PRs were
  merged by retargeting the child to `main` before deleting the parent branch.
- L3 (evidence): merge commits #9 `d7dffd4`, #10 `c435a7e`, #11 `429bb64`, #12 `e382179`, #13
  `bf1d4c5`, #14 `e5192fd`, #15 `7214d58`, #16 `283d59a`; `main` tree identical to `e7d6cad`.
- L4 (evidence): release commit `c1325cd`; `pnpm publish` exit 0 (prepack quality 452 tests);
  npm dist-tag `latest` = 2.0.0 (visible after ~3 minutes); tag `v2.0.0` → `c1325cd`. From an
  empty directory: `npx -y @yoryoboy/arcamcp@2.0.0 help` prints the help, `doctor` exits 1 (no
  configuration), stdio `initialize` answers `{"name":"arcamcp","version":"2.0.0"}`, 20 tools all
  with `outputSchema`, empty stderr. Not verified against a real ARCA account.
