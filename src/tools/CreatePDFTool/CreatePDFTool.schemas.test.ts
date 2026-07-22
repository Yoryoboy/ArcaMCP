import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createValidInput = () => ({
  CbteTipo: 11,
  CbteLetra: "C" as const,
  Concepto: 1 as const,
  NOMBRE_EMISOR: "Owner Name",
  DIRECCION_EMISOR: "Owner Address",
  CondicionIVAEmisor: "Monotributo",
  FECHA_INICIO_ACTIVIDADES: "2022-01",
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

describe("CreatePDFInputSchema", () => {
  const originalAfipCuit = process.env.AFIP_CUIT;

  beforeEach(() => {
    vi.resetModules();
    process.env.AFIP_CUIT = "20123456789";
  });

  afterEach(() => {
    vi.resetModules();

    if (originalAfipCuit === undefined) {
      delete process.env.AFIP_CUIT;
      return;
    }

    process.env.AFIP_CUIT = originalAfipCuit;
  });

  it("defaults CUIT_EMISOR from the configured owner CUIT when omitted", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const result = CreatePDFInputSchema.parse(createValidInput());

    expect(result.CUIT_EMISOR).toBe("20123456789");
  });

  it("fails when CUIT_EMISOR is omitted and the configured owner CUIT is blank", async () => {
    process.env.AFIP_CUIT = "";

    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    expect(() => CreatePDFInputSchema.parse(createValidInput())).toThrow(
      "AFIP_CUIT must be configured when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when CUIT_EMISOR is omitted and the configured owner CUIT is only whitespace", async () => {
    process.env.AFIP_CUIT = "   ";

    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    expect(() => CreatePDFInputSchema.parse(createValidInput())).toThrow(
      "AFIP_CUIT must be configured when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("fails when CUIT_EMISOR is omitted and the configured owner CUIT has invalid syntax", async () => {
    process.env.AFIP_CUIT = "2012345678";

    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    expect(() => CreatePDFInputSchema.parse(createValidInput())).toThrow(
      "AFIP_CUIT must be exactly 11 digits when CreatePDFTool omits CUIT_EMISOR",
    );
  });

  it("defaults FECHA_INICIO_ACTIVIDADES to an empty string when omitted", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const { FECHA_INICIO_ACTIVIDADES } = CreatePDFInputSchema.parse({
      ...createValidInput(),
      FECHA_INICIO_ACTIVIDADES: undefined,
    });

    expect(FECHA_INICIO_ACTIVIDADES).toBe("");
  });

  it("fails when FECHA_INICIO_ACTIVIDADES is an explicit short non-empty value", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    expect(() =>
      CreatePDFInputSchema.parse({
        ...createValidInput(),
        FECHA_INICIO_ACTIVIDADES: "202",
      }),
    ).toThrow("FECHA_INICIO_ACTIVIDADES debe ser AAAA-MM o vacío");
  });

  it("accepts an explicit empty FECHA_INICIO_ACTIVIDADES value", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const result = CreatePDFInputSchema.parse({
      ...createValidInput(),
      FECHA_INICIO_ACTIVIDADES: "",
    });

    expect(result.FECHA_INICIO_ACTIVIDADES).toBe("");
  });

  it("preserves an explicit CUIT_EMISOR provided by the caller", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const result = CreatePDFInputSchema.parse({
      ...createValidInput(),
      CUIT_EMISOR: "20999888777",
    });

    expect(result.CUIT_EMISOR).toBe("20999888777");
  });

  it("normalizes numeric CUIT_EMISOR values to strings", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const result = CreatePDFInputSchema.parse({
      ...createValidInput(),
      CUIT_EMISOR: 20999888777,
    });

    expect(result.CUIT_EMISOR).toBe("20999888777");
  });

  it.each([1, 2, 3] as const)("accepts supported Concepto %s", async (Concepto) => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");
    const serviceDates =
      Concepto === 1
        ? {}
        : { FchServDesde: "20260614", FchServHasta: "20260614", FchVtoPago: "20260614" };

    expect(
      CreatePDFInputSchema.parse({ ...createValidInput(), ...serviceDates, Concepto }).Concepto,
    ).toBe(Concepto);
  });

  it.each([undefined, 1.5, 0, 4])("rejects invalid Concepto %s", async (Concepto) => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    const result = CreatePDFInputSchema.safeParse({ ...createValidInput(), Concepto });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(["Concepto"]);
  });

  it.each(["", "20260230", "2026-02-28", "20261301"])(
    "rejects invalid CbteFch %s",
    async (CbteFch) => {
      const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");
      const result = CreatePDFInputSchema.safeParse({ ...createValidInput(), CbteFch });

      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: ["CbteFch"] }));
    },
  );

  it("requires all service dates for concepts 2 and 3", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    for (const Concepto of [2, 3]) {
      const result = CreatePDFInputSchema.safeParse({ ...createValidInput(), Concepto });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.path)).toEqual(
          expect.arrayContaining([["FchServDesde"], ["FchServHasta"], ["FchVtoPago"]]),
        );
      }
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
  ] as const)(
    "rejects %s with an invalid service date value for concepts 2 and 3",
    async (field, value) => {
      const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

      for (const Concepto of [2, 3] as const) {
        const result = CreatePDFInputSchema.safeParse({
          ...createValidInput(),
          Concepto,
          FchServDesde: "20260614",
          FchServHasta: "20260614",
          FchVtoPago: "20260614",
          [field]: value,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field] }));
        }
      }
    },
  );

  it("accepts product invoices without service dates", async () => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");

    expect(CreatePDFInputSchema.parse(createValidInput()).FchServDesde).toBeUndefined();
  });

  it.each([
    { FchServDesde: "20260615", FchServHasta: "20260614" },
    { FchServDesde: "20260614", FchServHasta: "20260614", FchVtoPago: "20260613" },
  ])("rejects invalid service date chronology", async (dates) => {
    const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");
    const serviceDates = dates.FchVtoPago ? dates : { ...dates, FchVtoPago: "20260614" };
    const result = CreatePDFInputSchema.safeParse({
      ...createValidInput(),
      Concepto: 2,
      ...serviceDates,
    });

    expect(result.success).toBe(false);
  });

  it.each(["NOMBRE_EMISOR", "DIRECCION_EMISOR", "CondicionIVAEmisor"])(
    "rejects whitespace-only %s",
    async (field) => {
      const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");
      const result = CreatePDFInputSchema.safeParse({ ...createValidInput(), [field]: "   " });

      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(expect.objectContaining({ path: [field] }));
    },
  );

  it.each(["123", "1234567890", "123456789012", "abc12345678"])(
    "rejects explicit CUIT_EMISOR %s",
    async (CUIT_EMISOR) => {
      const { CreatePDFInputSchema } = await import("./CreatePDFTool.schemas.js");
      const result = CreatePDFInputSchema.safeParse({ ...createValidInput(), CUIT_EMISOR });

      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({ path: ["CUIT_EMISOR"] }),
        );
    },
  );

  it("exposes base metadata shape separately from refined runtime validation", async () => {
    const { CreatePDFInputBaseSchema, CreatePDFInputSchema } =
      await import("./CreatePDFTool.schemas.js");
    const { CreatePDFTool } = await import("./CreatePDFTool.js");

    expect(CreatePDFInputBaseSchema.shape).toHaveProperty("Concepto");
    expect(CreatePDFTool.metadata.inputSchema).toBe(CreatePDFInputBaseSchema.shape);
    expect(CreatePDFInputSchema.safeParse({ ...createValidInput(), Concepto: 2 }).success).toBe(
      false,
    );
  });
});
