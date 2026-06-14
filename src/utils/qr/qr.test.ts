import QRCode from "qrcode";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateQRCode } from "./qr.js";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(),
  },
}));

describe("generateQRCode", () => {
  const qrPayload = {
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
    vi.mocked(QRCode.toDataURL).mockResolvedValue("data:image/png;base64,qr");

    const result = await generateQRCode(qrPayload);
    const encodedPayload = Buffer.from(JSON.stringify(qrPayload)).toString("base64");

    expect(result).toBe("data:image/png;base64,qr");
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      `https://www.arca.gob.ar/fe/qr/?p=${encodedPayload}`,
      { width: 300 },
    );
  });

  it("returns the stringified QR library error when generation fails", async () => {
    vi.mocked(QRCode.toDataURL).mockRejectedValue(new Error("QR generation failed"));

    await expect(generateQRCode(qrPayload)).resolves.toBe(
      "Error: QR generation failed",
    );
  });
});
