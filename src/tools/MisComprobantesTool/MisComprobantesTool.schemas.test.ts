import { describe, expect, it } from "vitest";
import { MisComprobantesInputSchema } from "./MisComprobantesTool.schemas.js";

describe("MisComprobantesInputSchema", () => {
  const validInput = {
    t: "E" as const,
    fechaEmision: "01/06/2026 - 14/06/2026",
    puntosVenta: [1, 2],
    tiposComprobantes: [11],
    comprobanteDesde: 1,
    comprobanteHasta: 10,
    tipoDoc: 80,
    nroDoc: "20-12345678-9",
    codigoAutorizacion: "12345678901234",
  };

  it("normalizes document ids and defaults wait to false", () => {
    const parsed = MisComprobantesInputSchema.parse(validInput);

    expect(parsed.nroDoc).toBe("20123456789");
    expect(parsed.wait).toBe(false);
  });

  it("accepts numeric document ids and normalizes them to strings", () => {
    const parsed = MisComprobantesInputSchema.parse({
      ...validInput,
      nroDoc: 20123456789,
    });

    expect(parsed.nroDoc).toBe("20123456789");
  });

  it("keeps omitted document ids undefined and accepts explicit empty filter arrays", () => {
    const parsed = MisComprobantesInputSchema.parse({
      t: "R",
      fechaEmision: "01/06/2026 - 14/06/2026",
      puntosVenta: [],
      tiposComprobantes: [],
    });

    expect(parsed.nroDoc).toBeUndefined();
    expect(parsed.puntosVenta).toEqual([]);
    expect(parsed.tiposComprobantes).toEqual([]);
  });

  it("rejects invalid voucher ranges", () => {
    const result = MisComprobantesInputSchema.safeParse({
      ...validInput,
      comprobanteDesde: 5,
      comprobanteHasta: 4,
    });

    expect(result.success).toBe(false);
  });

  it("rejects malformed date ranges and authorization codes", () => {
    expect(
      MisComprobantesInputSchema.safeParse({
        ...validInput,
        fechaEmision: "2026-06-01/2026-06-14",
      }).success,
    ).toBe(false);

    expect(
      MisComprobantesInputSchema.safeParse({
        ...validInput,
        codigoAutorizacion: "1234",
      }).success,
    ).toBe(false);
  });

  it("rejects non-positive and non-integer filter ids", () => {
    expect(
      MisComprobantesInputSchema.safeParse({
        ...validInput,
        puntosVenta: [0],
      }).success,
    ).toBe(false);

    expect(
      MisComprobantesInputSchema.safeParse({
        ...validInput,
        tiposComprobantes: [11.5],
      }).success,
    ).toBe(false);
  });
});
