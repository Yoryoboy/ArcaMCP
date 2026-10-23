# Onboarding CLI, resilient config and tool annotations

Branch `feat/onboarding-cli-and-annotations`. Delivers proposals 2 (validated config + lazy AFIP client),
1 (published `setup`/`doctor` CLI) and 4 (MCP tool annotations) from the repository sweep.

## Specs

- S1 (proposal 2): "validar la config con zod y crear el cliente AFIP de forma lazy: el server siempre arranca, las tools devuelven un error claro (\"falta AFIP_PROD_CERT_PATH\") y `get_certificate_status` sirve justamente para diagnosticar."
- S2 (proposal 2): "`AFIP_PASSWORD` y `AFIP_CERT_ALIAS` figuran como obligatorias pero solo las usan las automatizaciones → requerirlas solo cuando hacen falta."
- S3 (proposal 1): "subcomandos en el bin: `arcamcp setup` (cert dev/prod + autorizar servicios) y `arcamcp doctor` (chequea env, rutas, vencimiento del cert, servicios autorizados, punto de venta)." Chosen: "setup + doctor" — `setup` runs the whole onboarding (certificate + authorize wsfe and padrón A13); `doctor` diagnoses without modifying anything. Without arguments `arcamcp` keeps starting the MCP server.
- S4 (proposal 1): "Dev y prod" — setup uses the afipsdk automations `create-cert-dev` / `auth-web-service-dev` or `create-cert-prod` / `auth-web-service-prod` according to `AFIP_PRODUCTION` or a `--prod`/`--dev` flag.
- S5 (proposal 1): "Además escribe .env" — setup writes `.crt`/`.key` under `./certs/<env>/` (never overwriting existing files unless `--force`), creates or updates the paths in `.env` of the current directory, and prints the `env` JSON block ready to paste into the MCP client.
- S6 (proposal 1): "Env o prompt oculto" — use `AFIP_PASSWORD` if set; otherwise ask on the terminal without echo. Never store it.
- S7 (proposal 1): "`tsx` no está en `devDependencies` … `pnpm run dev` y los `pnpm exec tsx scripts/...` del README probablemente fallan en un clone limpio." The published package must cover what `scripts/getProdCerts.ts` and `scripts/authService.ts` did.
- S8 (proposal 4): "`readOnlyHint: true` en catálogos/consultas, `destructiveHint: true` (o `idempotentHint: false`) en `create_voucher`/`create_next_voucher`. Claude Desktop/Cursor y otros usan esto para pedir confirmación solo donde importa."

## Tasks

- T1 [S1,S2] config validation + lazy client + lazy preflight — inline — commit: 3000c52 (slice 1)
- T2 [S3-S7] CLI `setup`/`doctor`, `--help`, tsx devDependency, scripts migrated, README — inline — commit: pending (slice 2, own commit: Risk item 1, writes keys and .env)
- T3 [S8] tool annotations — inline — commit: pending

## Log

- L1: "haz un barrido del repo y propon mejoras que aporten valor y facilidad de uso para el usuario o features que por ahi aporten valor al uso tambien" → proposals; then "dale, arranquemso por 2, 1 y 4".
- L2: user decisions: CLI = "setup + doctor (Recomendado)"; environment = "Dev y prod (Recomendado)"; output = "Además escribe .env"; password = "Env o prompt oculto (Recomendado)".
- L3: afipsdk docs confirm automations `create-cert-dev` and `auth-web-service-dev` with params cuit, username, password, alias (+ service).
- L4: T1 verified: 307 tests, typecheck, lint, quality; stdio smoke with empty env returns CONFIGURATION_ERROR for get_certificate_status and get_voucher_types. Slice boundary: each task is its own commit.
- L5: T2 verified: quality 367 tests; doctor by gentle-ai-worker (RED 18 failing → GREEN), parent added doctor dedupe (RED→GREEN); setup/envFile tests written after code, validated by mutation (3 tests fail when --force guard removed and password written). Smoke from dist in empty dir: doctor exit 1 listing issues, setup non-interactive exit 1 without writes, unknown command exit 2. `pnpm run dev -- x` forwards `--` under pnpm 11, README uses `pnpm run dev <comando>`. Test fixtures excluded from npm `files`.
