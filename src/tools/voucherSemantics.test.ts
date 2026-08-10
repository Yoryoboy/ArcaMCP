import { describe, expect, it } from "vitest";

import { NextVoucherSchema } from "./CreateNextVoucherTool/CreateNextVoucherTool.schemas.js";
import { VoucherSchema } from "./CreateVoucherTool/CreateVoucherTool.schemas.js";
import { isValidAfipDate, isTipoC, TIPO_C_SET } from "./voucherSemantics.js";

// Factura C (monotributo) de productos válida: sin fechas de servicio.
const validProducts = {
  PtoVta: 1,
  CbteTipo: 11,
  Concepto: 1,
  DocTipo: 99,
  CbteFch: "20260614",
  ImpTotal: 121,
  ImpTotConc: 0,
  ImpNeto: 121,
  ImpOpEx: 0,
  ImpIVA: 0,
  ImpTrib: 0,
  MonId: "PES",
  MonCotiz: 1,
  CondicionIVAReceptorId: 5,
};

// Factura C de servicios válida: concepto 2 con las tres fechas de servicio.
const validServices = {
  ...validProducts,
  Concepto: 2,
  ImpTotal: 100,
  ImpNeto: 100,
  FchServDesde: "20260601",
  FchServHasta: "20260630",
  FchVtoPago: "20260614",
};

const parseCore = (data: unknown) => NextVoucherSchema.safeParse(data);

describe("isValidAfipDate", () => {
  it.each(["20260614", "20261231", "20240229"])("accepts the valid date %s", (value) => {
    expect(isValidAfipDate(value)).toBe(true);
  });

  it.each([
    ["2026-06-14", "separadores"],
    ["2026061", "siete dígitos"],
    ["20261301", "mes trece"],
    ["20260230", "febrero treinta"],
    ["20260231", "febrero treinta y uno"],
    ["20230229", "bisiesto inválido"],
    ["abcdefgh", "letras"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidAfipDate(value)).toBe(false);
  });
});

describe("isTipoC", () => {
  it("recognises every documented tipo C code", () => {
    for (const code of TIPO_C_SET) {
      expect(isTipoC(code)).toBe(true);
    }
  });

  it("rejects non-C types", () => {
    expect(isTipoC(1)).toBe(false);
    expect(isTipoC(6)).toBe(false);
    expect(isTipoC(49)).toBe(false);
  });
});

describe("core voucher semantic validation", () => {
  it("accepts valid products and services vouchers", () => {
    expect(parseCore(validProducts).success).toBe(true);
    expect(parseCore(validServices).success).toBe(true);
  });

  it("rejects malformed or impossible voucher dates", () => {
    expect(parseCore({ ...validProducts, CbteFch: "2026-06-14" }).success).toBe(false);
    expect(parseCore({ ...validProducts, CbteFch: "20260230" }).success).toBe(false);
  });

  it("requires the three service dates when concepto includes services", () => {
    expect(parseCore({ ...validServices, FchServDesde: undefined }).success).toBe(false);
    expect(parseCore({ ...validServices, FchServHasta: undefined }).success).toBe(false);
    expect(parseCore({ ...validServices, FchVtoPago: undefined }).success).toBe(false);
  });

  it("rejects service dates on a products-only voucher", () => {
    expect(parseCore({ ...validProducts, FchServDesde: "20260601" }).success).toBe(false);
  });

  it("enforces service date ordering", () => {
    expect(parseCore({ ...validServices, FchServHasta: "20260501" }).success).toBe(false);
    expect(parseCore({ ...validServices, FchVtoPago: "20260601" }).success).toBe(false);
  });

  it("rejects totals that do not balance", () => {
    expect(parseCore({ ...validProducts, ImpTotal: 999 }).success).toBe(false);
  });

  it("accepts a balanced total within floating-point tolerance", () => {
    expect(
      parseCore({
        ...validProducts,
        CbteTipo: 6,
        ImpNeto: 100,
        ImpIVA: 21,
        ImpTotal: 121,
      }).success,
    ).toBe(true);
  });

  it("rejects tipo C vouchers that discriminate IVA or non-taxable amounts", () => {
    expect(
      parseCore({
        ...validProducts,
        ImpNeto: 100,
        ImpIVA: 21,
        ImpTotal: 121,
      }).success,
    ).toBe(false);

    expect(
      parseCore({
        ...validProducts,
        ImpTotConc: 10,
        ImpNeto: 111,
        ImpTotal: 121,
      }).success,
    ).toBe(false);
  });

  it("rejects tipo C vouchers that include an Iva array", () => {
    // Totales consistentes e ImpIVA=0: lo único inválido es el array Iva presente.
    expect(
      parseCore({
        ...validProducts,
        Iva: [{ Id: 5, BaseImp: 121, Importe: 0 }],
      }).success,
    ).toBe(false);
  });

  it("allows IVA on non-tipo-C vouchers", () => {
    expect(
      parseCore({
        ...validProducts,
        CbteTipo: 6,
        ImpNeto: 100,
        ImpIVA: 21,
        ImpTotal: 121,
      }).success,
    ).toBe(true);
  });

  it("forces MonCotiz to 1 for PES", () => {
    expect(parseCore({ ...validProducts, MonCotiz: 1200 }).success).toBe(false);
    expect(parseCore({ ...validProducts, MonId: "DOL", MonCotiz: 1200 }).success).toBe(true);
  });

  it("requires DocNro except for low-amount consumidor final", () => {
    // CUIT (DocTipo 80) siempre requiere DocNro.
    expect(parseCore({ ...validProducts, DocTipo: 80 }).success).toBe(false);
    expect(parseCore({ ...validProducts, DocTipo: 80, DocNro: 20123456789 }).success).toBe(true);

    // Consumidor final bajo el umbral puede omitirlo.
    expect(parseCore({ ...validProducts, DocTipo: 99 }).success).toBe(true);

    // Consumidor final sobre el umbral requiere DocNro.
    expect(
      parseCore({
        ...validProducts,
        DocTipo: 99,
        ImpTotal: 10_000_000,
        ImpNeto: 10_000_000,
      }).success,
    ).toBe(false);
  });
});

describe("manual numbering range validation (create_voucher)", () => {
  const parseVoucher = (data: unknown) => VoucherSchema.safeParse(data);
  const withRange = (
    range: Partial<{ CantReg: number; CbteDesde: number; CbteHasta: number }>,
  ) => ({
    ...validProducts,
    CantReg: 1,
    CbteDesde: 10,
    CbteHasta: 10,
    ...range,
  });

  it("accepts a consistent single-voucher range", () => {
    expect(parseVoucher(withRange({})).success).toBe(true);
  });

  it("accepts a consistent multi-voucher range", () => {
    expect(parseVoucher(withRange({ CantReg: 3, CbteDesde: 10, CbteHasta: 12 })).success).toBe(
      true,
    );
  });

  it("rejects CbteDesde greater than CbteHasta", () => {
    expect(parseVoucher(withRange({ CantReg: 1, CbteDesde: 11, CbteHasta: 10 })).success).toBe(
      false,
    );
  });

  it("rejects a CantReg that does not match the range", () => {
    expect(parseVoucher(withRange({ CantReg: 5, CbteDesde: 10, CbteHasta: 10 })).success).toBe(
      false,
    );
  });

  it("rejects voucher numbers above the maximum", () => {
    expect(
      parseVoucher(withRange({ CantReg: 1, CbteDesde: 100_000_000, CbteHasta: 100_000_000 }))
        .success,
    ).toBe(false);
  });
});
