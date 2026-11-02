# Node 22 baseline

Raise the supported Node floor to 22, develop on Node 26, and replace code with built-in Node
features where it simplifies the project. Branch `chore/node-22-baseline`, stacked on
`chore/dependency-refresh`.

## Specs

- S1: "actualicemos node a su ultima version" — development uses the latest Node LTS (26) and the
  published package requires `engines.node >=22` (user decision L2); `@types/node` follows the
  floor (22.x) and the README states the new minimum.
- S2: "Vemoas i trae nuevos features que podamos utilizar para remepzara cosas y hacverla smas
  eficinetes" — replace `dotenv` with `process.loadEnvFile()` and `fileURLToPath` + `dirname` with
  `import.meta.dirname`, with no change in observable behaviour: a missing `.env` is not an error,
  variables already set in the environment win, and nothing is written to stdout or stderr.
- S3: Every value `arcamcp setup` writes to `.env` reads back unchanged through Node's parser
  (`util.parseEnv`), including Windows paths, `#`, `$`, `'`, `"` and backticks; a value no quoting
  can represent is rejected with a clear error instead of being written corrupted.
- S4: Date suggestions for the voucher prompt use the calendar date in Argentina
  (`America/Argentina/Buenos_Aires`), whatever the host time zone.
- S5: `pnpm run quality` and `pnpm run build` pass on Node 22 and Node 26.

## Tasks

- [x] T1 (S3) Round-trip `.env` quoting through `util.parseEnv` — inline — commit
- [ ] T2 (S2) Replace dotenv with `process.loadEnvFile()` — inline — commit
- [ ] T3 (S2) Use `import.meta.dirname` in CreatePDFTool helpers — inline — commit
- [ ] T4 (S4) Argentina calendar date for prompt date suggestions — inline — commit
- [ ] T5 (S1, S5) engines >=22, @types/node 22, `.node-version` 26, README — inline — commit
- [ ] T6 (S5) Run quality and build on Node 22 and 26, stdio smoke — inline — no commit

## Log

- L1 (user): "si, actualicemos node a su ultima version. Vemoas i trae nuevos features que podamos
  utilizar para remepzara cosas y hacverla smas eficinetes"
- L2 (user decision): `engines >=22` (Node 22 EOL 2027-04-30; raise the floor to the oldest
  supported LTS each April). Node 26 installed locally with fnm.
- L3 (decision): not adopted — `util.parseArgs` (would rewrite tested Spanish CLI errors and exit
  codes for ~15 lines), native type stripping instead of `tsx` (every relative import uses `.js`,
  plus a parameter property), `X509Certificate.validToDate` (needs Node 22.10, above the floor),
  Temporal (needs Node 26), `qrcode` (no native QR encoder).
- L4 (evidence): `updateEnvContent` writes `"it's \"quoted\""` for values with both quote types;
  neither `util.parseEnv` nor dotenv 18 unescapes `\"`, and both expand `\n` inside double quotes,
  so a Windows path containing `'` was also corrupted. Pre-existing on dotenv; verified on Node
  22.23.4, 24.22.2 and 26.13.0.
