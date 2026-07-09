import { describe, expect, it } from "vitest";
import { EmptySchema, IvaItemSchema, VoucherCoreSchema } from "./shared.schemas.js";

describe("shared schemas", () => {
  const validVoucher = {
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

  it("accepts an empty params object", () => {
    expect(EmptySchema.safeParse({}).success).toBe(true);
  });

  it("rejects non-object values for the empty params schema", () => {
    expect(EmptySchema.safeParse(null).success).toBe(false);
  });

  it("accepts valid core voucher payloads", () => {
    expect(VoucherCoreSchema.safeParse(validVoucher).success).toBe(true);
  });

  it("rejects invalid core voucher payloads", () => {
    expect(
      VoucherCoreSchema.safeParse({
        ...validVoucher,
        Concepto: 4,
      }).success,
    ).toBe(false);
  });

  it("accepts valid IVA items and rejects invalid ones", () => {
    expect(
      IvaItemSchema.safeParse({
        Id: 5,
        BaseImp: 100,
        Importe: 21,
      }).success,
    ).toBe(true);

    expect(
      IvaItemSchema.safeParse({
        Id: 5,
        BaseImp: "100",
        Importe: 21,
      }).success,
    ).toBe(false);
  });
});
