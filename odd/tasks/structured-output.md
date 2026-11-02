# Structured output for every tool

Add MCP structured output (`outputSchema` + `structuredContent`) to all 20 tools. Branch
`feat/structured-output`, stacked on `perf/catalog-cache` (#12).

## Specs

- S1: "hagamoslo para todas las tools" — every tool registered in `src/server.ts` declares an
  `outputSchema` in `tools/list`, and every non-error result carries a `structuredContent` object
  that passes the SDK's output validation.
- S2: Text content stays byte-for-byte what each tool returns today; `structuredContent` is added
  alongside it. Error results (`isError: true`) are unchanged.
- S3: `structuredContent` is always a JSON object: list results as `{ items }`, `get_last_voucher`
  as `{ CbteNro }`, `get_cuit_from_dni` as `{ cuit }`; guard and not-found messages as
  `{ message }`, still without `isError`.
- S4: Schemas are strict only for payloads our code builds (`create_pdf`,
  `get_certificate_status`, automation start); AFIP passthrough payloads document their known fields
  as optional and accept extra fields, so a valid AFIP response never becomes a validation error.
- S5: A protocol test drives every tool through an MCP client and checks `outputSchema` and
  `structuredContent`; `pnpm run quality` and `pnpm run build` pass.

## Tasks

- [x] T1 (S5) `createServer()` so the server can be driven in-process; stdio start moves to `startStdioServer()` — inline — commit
- [x] T2 (S2, S3) Shared `structuredContent` support in the response helpers and `MCPResponse` — inline — commit
- [ ] T3 (S1, S3, S4) Output schemas: catalog tools and `get_sales_points` — commit
- [ ] T4 (S1, S3, S4) Output schemas: voucher and exchange-rate tools — commit
- [ ] T5 (S1, S3, S4) Output schemas: taxpayer, CUIT, PDF, automation and certificate tools — commit
- [ ] T6 (S1, S5) Protocol test over all 20 tools, stdio smoke — inline — commit

## Log

- L1 (user): "hagamoslo para todas las tools" (after the tradeoffs: modest value for chat clients,
  larger `tools/list`, risk of over-strict schemas over AFIP `any` payloads).
- L2 (evidence): SDK 1.32.2 `McpServer.validateToolOutput` (`mcp.js:239-260`) skips `isError`
  results, rejects a non-error result without `structuredContent` once `outputSchema` is set, and
  turns a schema mismatch into a tool error.
- L3 (decision): keep text unchanged (S2) instead of serializing `structuredContent` into it, so
  chat clients see no difference; keep guard/not-found responses as non-errors with `{ message }`
  (S3) rather than flipping them to `isError`, which would change behaviour.
- L4 (evidence): `@afipsdk/afip.js` types every ElectronicBilling and padron result as `any`
  (`types/ElectronicBilling.d.ts`); passthrough schemas come from our own types and AFIP docs.
