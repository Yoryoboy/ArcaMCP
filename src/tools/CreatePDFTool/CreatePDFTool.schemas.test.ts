import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createValidInput = () => ({
  CbteTipo: 11,
  CbteLetra: "C" as const,
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
});
