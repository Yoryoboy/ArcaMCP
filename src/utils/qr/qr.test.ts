import { afterEach, describe, expect, it, vi } from "vitest";
import { generateQRCode, type QRData } from "./qr.js";

type ToDataURL = (text: string, options?: { width?: number }) => Promise<string>;

const qrcodeMocks = vi.hoisted(() => ({
  toDataURL: vi.fn<ToDataURL>(),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: qrcodeMocks.toDataURL,
  },
}));

describe("generateQRCode", () => {
  const qrPayload: QRData = {
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

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("builds the expected ARCA QR url and delegates image generation", async () => {
    qrcodeMocks.toDataURL.mockResolvedValue("data:image/png;base64,qr");

    const result = await generateQRCode(qrPayload);
    const encodedPayload = Buffer.from(JSON.stringify(qrPayload)).toString("base64");

    expect(result).toBe("data:image/png;base64,qr");
    expect(qrcodeMocks.toDataURL).toHaveBeenCalledWith(
      `https://www.arca.gob.ar/fe/qr/?p=${encodedPayload}`,
      { width: 300 },
    );
  });

  it("returns the stringified QR library error when generation fails", async () => {
    qrcodeMocks.toDataURL.mockRejectedValue(new Error("QR generation failed"));

    await expect(generateQRCode(qrPayload)).resolves.toBe(
      "Error: QR generation failed",
    );
  });
});
