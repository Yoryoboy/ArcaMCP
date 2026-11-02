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
- [x] T6 (S1, S2, S3) Zod 4 — inline — commit
- [x] T7 (S1-S3) Final stdio differential and verification — inline (verifier not admitted) — no commit

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
- L5 (evidence, T5): dotenv 18 prints `◇ injected env (N) from .env` to stderr by default; dotenv 16
  was silent. Fixed with `quiet: true`, pinned by `src/config.test.ts`. Parsing of quoted Windows
  paths, `#` and `export` lines is unchanged.
- L6 (evidence, T6): Zod 4 runs `.transform()` after non-fatal `superRefine` issues, so
  `CreatePDFInputSchema.safeParse()` threw instead of returning `success: false`; the transform now
  uses `safeParse` and returns `z.NEVER`.
- L7 (evidence, T6): Zod 4 drops `.describe()` metadata when `.optional()` wraps the schema, so all
  15 completable prompt arguments lost their description in `prompts/list`. While pinning it over
  MCP, `completion/complete` was found returning `[]` already on Zod 3: `McpServer` (SDK 1.32.2)
  looks for the completer inside `ZodOptional` when registering but on the field itself when
  answering. `optionalCompletable()` puts the completer on both layers; pinned by
  `CreateVoucherPrompt.protocol.test.ts`.
- L8 (evidence, T6): stdio differential against the Zod 3 build. `prompts/list` is identical.
  `tools/list` differs only in equivalent JSON Schema (`enum` → `anyOf` of `const`, inlined `$ref`,
  `oneOf` for the discriminated union, `.int()` adds `maximum: 2^53-1`) and in dropping
  `additionalProperties: false` for non-strict objects, which matches runtime behaviour (unknown keys
  are stripped on both versions). Tool validation errors keep their paths and custom messages; only
  Zod's default English wording changes (e.g. `Required` → `Invalid input: expected number, received
  undefined`).
- L9 (evidence, T7): at HEAD `pnpm outdated` lists only the two holds from L2/L3; `pnpm run quality`
  exit 0 (41 files, 370 tests); `pnpm run build` exit 0; stdio from an empty dir: JSON-only stdout,
  empty stderr, 20 tools, 19 described prompt args, `completion/complete` returns values.
  `INVOICE_ITEMS` still defaults to `[]` and `ResolvedObjectSchema` still rejects unknown keys.
  The independent verifier was not admitted by the runtime; verification ran inline.
