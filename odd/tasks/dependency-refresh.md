# Dependency refresh

Bring every dependency to its latest version that the rest of the toolchain supports.
Branch `chore/dependency-refresh`; one work-unit commit per major upgrade.

## Specs

- S1: "haria un barrido de las dependencias a ver si estan actualizadas y ponerlas al dia" — every
  dependency in `package.json` moves to its latest release, unless a peer constraint of another
  dependency forbids it; each held-back package is named with the constraint that holds it.
- S2: `pnpm run quality` and `pnpm run build` pass after every commit.
- S3: The stdio server still answers `initialize`, `tools/list`, `prompts/list` and
  `get_certificate_status` with JSON-only stdout, and `tools/list` matches the pre-upgrade baseline
  except for differences explained in the Log.

## Tasks

- [x] T0 (S3) Capture the pre-upgrade stdio baseline — inline — no commit (scratch `/tmp/arcamcp-deps`)
- [x] T1 (S1, S2) In-range updates: MCP SDK 1.32, prettier, typescript-eslint, tsx, `@types/node` 24.x — inline — commit
- [x] T2 (S1, S2) ESLint 10 and `@eslint/js` 10 — inline — commit
- [x] T3 (S1, S2) Vitest 5 and `@vitest/coverage-v8` 5 — inline — commit
- [x] T4 (S1, S2) TypeScript 6.0.3 — inline — commit
- [x] T5 (S1, S2, S3) dotenv 18 — inline — commit
- [ ] T6 (S1, S2, S3) Zod 4 — inline — commit
- [ ] T7 (S1-S3) Final stdio differential and independent verification — verify — no commit

## Log

- L1 (user): "me sgutan trodas esas, pero primero haria un barrido de las dpeendencias a ver si
  estan actualizadas y ponerlas al dia"
- L2 (decision): TypeScript held at 6.0.3, not 7.0.2: `typescript-eslint@8.72.1` peer requires
  `typescript >=4.8.4 <6.1.0`, and TS 7.0 ships without a compiler API.
- L3 (decision): `@types/node` held on the 24.x line, not 26: types must not expose APIs newer than
  the supported runtime (`engines.node >=20`). Node 20 reached end of life in April 2026; raising
  `engines` is a separate consumer-facing decision.
- L4 (note): MCP SDK v2 ships as split `@modelcontextprotocol/*` packages; migrating to it is out of
  scope. `@modelcontextprotocol/sdk` 1.32.2 is the latest 1.x.
