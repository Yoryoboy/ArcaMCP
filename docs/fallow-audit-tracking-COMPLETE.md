# Fallow audit tracking

Source of truth for the repo-wide Fallow cleanup.

## Current status

- Last verified: 2026-06-28
- Dead code: **0 issues**
- Duplication: **0 issues**
- Health: **0 above threshold**
- Maintainability: **93.3 (good)**

## Closure rule

A finding is only closed when:

1. the code change is implemented
2. relevant tests pass
3. the relevant Fallow command is rerun
4. Fallow no longer reports that issue

## Findings summary

| ID | Category | Finding | Status | Resolution |
|---|---|---|---|---|
| FA-001 | Duplication | Shared boilerplate across `Get*Type` tools | Resolved | `createCatalogTool` extracted; original cluster removed from `npx fallow dupes` |
| FA-002 | Duplication | Clone family between `CreateVoucherTool` and `CreateNextVoucherTool` | Resolved | Shared voucher execution helpers extracted; pair removed from `npx fallow dupes` |
| FA-003 | Health | `CreatePDFTool.execute()` complexity hotspot | Resolved | Pure helper extraction + stronger execute-level tests; cleared in `npx fallow health` |
| FA-004 | Health | `MisComprobantesTool.execute()` complexity hotspot | Resolved | Filter/payload helpers extracted; cleared in `npx fallow health` |
| FA-005 | Health | `errorProcessor.extractCodeFromObject()` branch-heavy hotspot | Resolved | Safe helper split preserving precedence/message semantics; cleared in `npx fallow health` |
| FA-006 | Dead code | `scripts/authService.ts` reported unused | Resolved | Marked as explicit Fallow entry point in `.fallowrc.json` |
| FA-007 | Dead code | `scripts/getProdCerts.ts` reported unused | Resolved | Marked as explicit Fallow entry point in `.fallowrc.json` |

## Key changes made

- Added `.fallowrc.json` with explicit entry points for manual operational scripts.
- Extracted shared helpers for catalog tools, voucher tools, automation tools, PDF generation, Mis Comprobantes, and prompt completers.
- Updated tests to stay compatible with the latest `@modelcontextprotocol/sdk`.
- Verified each closed item with the corresponding Fallow command.

## Final verification snapshot

- `npx fallow` → clean on dead code / duplication / above-threshold health
- `pnpm build` → passing
- `pnpm test` → passing

## Notes

- Some non-blocking churn/risk signals may still exist in Fallow reports, but they are not active dead-code, duplication, or above-threshold health failures.
