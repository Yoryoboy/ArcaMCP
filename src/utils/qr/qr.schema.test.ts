import { describe, expect, it } from "vitest";
import { QRDataSchema } from "./qr.schema.js";

describe("QRDataSchema", () => {
  const validPayload = {
    ver: 1,
    fecha: "2026-06-14",
    cuit: 20123456789,
    ptoVta: 1,
    tipoCmp: 11,
    nroCmp: 1234,
    importe: 1500,
    moneda: "PES",
    ctz: 1,
    tipoCodAut: "E" as const,
    codAut: 12345678901234,
  };

  it("accepts valid QR payloads", () => {
    const result = QRDataSchema.safeParse(validPayload);

    expect(result.success).toBe(true);
  });

  it("rejects values outside the schema boundaries", () => {
    const result = QRDataSchema.safeParse({
      ...validPayload,
      cuit: 1234567890,
      fecha: "20260614",
    });

    expect(result.success).toBe(false);
  });
});
