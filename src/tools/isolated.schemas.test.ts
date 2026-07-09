import { describe, expect, it } from "vitest";
import { VoucherSchema } from "./CreateVoucherTool/CreateVoucherTool.schemas.js";
import { NextVoucherSchema } from "./CreateNextVoucherTool/CreateNextVoucherTool.schemas.js";
import { GetAutomationDetailsInputSchema } from "./GetAutomationDetailsTool/GetAutomationDetailsTool.schemas.js";
import { GetCuitFromDniToolSchema } from "./GetCuitFromDniTool/GetCuitFromDniTool.schemas.js";
import { GetExchangeRateSchema } from "./GetExchangeRateTool/GetExchangeRateTool.schemas.js";
import { GetLastVoucherSchema } from "./GetLastVoucherTool/GetLastVoucherTool.schemas.js";
import { GetTaxpayerDetailsSchema } from "./GetTaxpayerDetailsTool/GetTaxpayerDetailsTool.schemas.js";
import { GetVoucherInfoSchema } from "./GetVoucherInfoTool/GetVoucherInfoTool.schemas.js";

describe("isolated tool schemas", () => {
  const validVoucherCore = {
    PtoVta: 1,
    CbteTipo: 11,
    Concepto: 1,
    DocTipo: 99,
    CbteFch: "20260614",
    ImpTotal: 121,
    ImpTotConc: 0,
    ImpNeto: 100,
    ImpOpEx: 0,
    ImpIVA: 21,
    ImpTrib: 0,
    MonId: "PES",
    MonCotiz: 1,
    CondicionIVAReceptorId: 5,
  };

  it("accepts valid create_voucher and create_next_voucher payloads", () => {
    expect(
      VoucherSchema.safeParse({
        ...validVoucherCore,
        CantReg: 1,
        CbteDesde: 1,
        CbteHasta: 1,
      }).success,
    ).toBe(true);

    expect(NextVoucherSchema.safeParse(validVoucherCore).success).toBe(true);
  });

  it("rejects create_voucher payloads with out-of-range manual numbering fields", () => {
    expect(
      VoucherSchema.safeParse({
        ...validVoucherCore,
        CantReg: 0,
        CbteDesde: 0,
        CbteHasta: 0,
      }).success,
    ).toBe(false);
  });

  it.each([
    {
      name: "last voucher lookup params",
      schema: GetLastVoucherSchema,
      valid: { PtoVta: 1, CbteTipo: 11 },
      invalid: { PtoVta: "1", CbteTipo: 11 },
    },
    {
      name: "voucher info lookup params",
      schema: GetVoucherInfoSchema,
      valid: { CbteNro: 1, PtoVta: 1, CbteTipo: 11 },
      invalid: { CbteNro: 0, PtoVta: 1, CbteTipo: 11 },
    },
    {
      name: "taxpayer details lookup params",
      schema: GetTaxpayerDetailsSchema,
      valid: { taxId: 20123456789 },
      invalid: { taxId: "20123456789" },
    },
    {
      name: "CUIT from DNI lookup params",
      schema: GetCuitFromDniToolSchema,
      valid: { nationalId: 12345678 },
      invalid: { nationalId: "12345678" },
    },
  ])("validates $name", ({ schema, valid, invalid }) => {
    expect(schema.safeParse(valid).success).toBe(true);
    expect(schema.safeParse(invalid).success).toBe(false);
  });

  it("enforces the exchange-rate date format", () => {
    expect(
      GetExchangeRateSchema.safeParse({
        MonId: "DOL",
        FchCotiz: "20260614",
      }).success,
    ).toBe(true);

    expect(
      GetExchangeRateSchema.safeParse({
        MonId: "DOL",
        FchCotiz: "2026-06-14",
      }).success,
    ).toBe(false);
  });

  it("defaults non-blocking automation lookups and rejects blank ids", () => {
    const parsed = GetAutomationDetailsInputSchema.parse({ id: "automation-123" });

    expect(parsed.wait).toBe(false);
    expect(
      GetAutomationDetailsInputSchema.safeParse({ id: "" }).success,
    ).toBe(false);
  });
});
