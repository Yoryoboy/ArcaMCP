import { describe, expect, it } from "vitest";

import {
  CreatePDFInputSchema,
  CreatePDFInputBaseSchema,
  ResolvedRefinedSchema,
} from "./CreatePDFTool.schemas.js";

const validPublicInput = () => ({
  CbteTipo: 11,
  CbteLetra: "C" as const,
  Concepto: 1 as const,
  CondicionIVAEmisor: "Monotributo",
  INGRESOS_BRUTOS: { condicion: "Local" as const, numeroInscripcion: "123" },
  FECHA_INICIO_ACTIVIDADES: "2022-01-31",
  PtoVta: 1,
  CbteNro: 123,
  CbteFch: "20260614",
  DocNro: "20304050607",
  NOMBRE_RECEPTOR: "Recipient Name",
  CondicionIVAReceptor: "Consumidor Final",
  SUBTOTAL: 100,
  IMPORTE_TOTAL: 100,
  CAE_NUMBER: "12345678901234",
  CAE_EXPIRY_DATE: "20260630",
});

describe("CreatePDF schemas", () => {
  it("exposes only caller-owned fields in metadata", () => {
    expect(CreatePDFInputBaseSchema.shape).not.toHaveProperty("CUIT_EMISOR");
    expect(CreatePDFInputBaseSchema.shape).not.toHaveProperty("NOMBRE_EMISOR");
    expect(CreatePDFInputBaseSchema.shape).not.toHaveProperty("DIRECCION_EMISOR");
    expect(CreatePDFInputBaseSchema.shape).toHaveProperty("FECHA_INICIO_ACTIVIDADES");
  });

  it.each(["CUIT_EMISOR", "NOMBRE_EMISOR", "DIRECCION_EMISOR"])(
    "rejects legacy owner field %s",
    (field) => {
      const result = CreatePDFInputSchema.safeParse({ ...validPublicInput(), [field]: "legacy" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field] }));
    },
  );

  it.each([
    ["2022-01-31", true],
    [undefined, false],
    ["2022-01", false],
    ["2022-02-30", false],
    ["20220131", false],
    ["2022-13-01", false],
  ] as const)("validates caller activity start date %s", (FECHA_INICIO_ACTIVIDADES, success) => {
    const result = CreatePDFInputSchema.safeParse({
      ...validPublicInput(),
      FECHA_INICIO_ACTIVIDADES,
    });
    expect(result.success).toBe(success);
    if (result.success) expect(result.data.FECHA_INICIO_ACTIVIDADES).toBe("2022-01-31");
    else
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({ path: ["FECHA_INICIO_ACTIVIDADES"] }),
      );
  });

  it("rejects unknown metadata fields", () => {
    expect(CreatePDFInputSchema.safeParse({ ...validPublicInput(), unknown: true }).success).toBe(
      false,
    );
  });

  it.each([1, 2, 3] as const)("accepts supported Concepto %s", (Concepto) => {
    const serviceDates =
      Concepto === 1
        ? {}
        : { FchServDesde: "20260614", FchServHasta: "20260614", FchVtoPago: "20260614" };

    expect(
      CreatePDFInputSchema.parse({ ...validPublicInput(), ...serviceDates, Concepto }).Concepto,
    ).toBe(Concepto);
  });

  it.each([undefined, 1.5, 0, 4])("rejects invalid Concepto %s", (Concepto) => {
    const result = CreatePDFInputSchema.safeParse({ ...validPublicInput(), Concepto });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["Concepto"]);
  });

  it.each(["", "20260230", "2026-02-28", "20261301"])("rejects invalid CbteFch %s", (CbteFch) => {
    const result = CreatePDFInputSchema.safeParse({ ...validPublicInput(), CbteFch });

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["CbteFch"] }));
  });

  it.each([
    { condicion: "Local", numeroInscripcion: "123" },
    { condicion: "Convenio Multilateral", numeroInscripcion: "456" },
    { condicion: "Exento" },
    { condicion: "No contribuyente" },
  ])("accepts valid IIBB variant %o", (INGRESOS_BRUTOS) => {
    expect(CreatePDFInputSchema.safeParse({ ...validPublicInput(), INGRESOS_BRUTOS }).success).toBe(
      true,
    );
  });

  it("rejects blank or contradictory IIBB registrations at the registration path", () => {
    for (const INGRESOS_BRUTOS of [
      { condicion: "Local", numeroInscripcion: " " },
      { condicion: "Exento", numeroInscripcion: "123" },
    ]) {
      const result = CreatePDFInputSchema.safeParse({ ...validPublicInput(), INGRESOS_BRUTOS });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((issue) => issue.path.includes("numeroInscripcion"))).toBe(
          true,
        );
    }
  });

  it("requires IVA condition and validates service dates", () => {
    expect(
      CreatePDFInputSchema.safeParse({ ...validPublicInput(), CondicionIVAEmisor: " " }).success,
    ).toBe(false);
    for (const Concepto of [2, 3] as const) {
      const result = CreatePDFInputSchema.safeParse({ ...validPublicInput(), Concepto });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((issue) => issue.path)).toEqual(
          expect.arrayContaining([["FchServDesde"], ["FchServHasta"], ["FchVtoPago"]]),
        );
    }
  });

  it.each([
    ["FchServDesde", ""],
    ["FchServDesde", "2026-06-14"],
    ["FchServDesde", "20260230"],
    ["FchServHasta", "2026-06-14"],
    ["FchServHasta", ""],
    ["FchServHasta", "20260230"],
    ["FchVtoPago", "20260230"],
    ["FchVtoPago", ""],
    ["FchVtoPago", "2026-06-14"],
  ] as const)("rejects %s with an invalid service date value", (field, value) => {
    for (const Concepto of [2, 3] as const) {
      const result = CreatePDFInputSchema.safeParse({
        ...validPublicInput(),
        Concepto,
        FchServDesde: "20260614",
        FchServHasta: "20260614",
        FchVtoPago: "20260614",
        [field]: value,
      });

      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field] }));
    }
  });

  it("accepts product invoices without service dates", () => {
    expect(CreatePDFInputSchema.parse(validPublicInput()).FchServDesde).toBeUndefined();
  });

  it.each([
    { FchServDesde: "20260615", FchServHasta: "20260614" },
    { FchServDesde: "20260614", FchServHasta: "20260614", FchVtoPago: "20260613" },
  ])("rejects invalid service date chronology", (dates) => {
    const serviceDates = dates.FchVtoPago ? dates : { ...dates, FchVtoPago: "20260614" };
    const result = CreatePDFInputSchema.safeParse({
      ...validPublicInput(),
      Concepto: 2,
      ...serviceDates,
    });

    expect(result.success).toBe(false);
  });

  it("validates provider fields only at the resolved boundary", () => {
    const publicInput = CreatePDFInputSchema.parse(validPublicInput());
    expect(() =>
      ResolvedRefinedSchema.parse({
        ...publicInput,
        CUIT_EMISOR: "20123456789",
        NOMBRE_EMISOR: "Owner Name",
        DIRECCION_EMISOR: "Owner Address",
      }),
    ).not.toThrow();
  });
});
