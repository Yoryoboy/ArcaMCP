import QRCode from "qrcode";
import { z } from "zod";
import { QRDataSchema } from "./qr.schema.js";

export type QRData = z.infer<typeof QRDataSchema>;

export async function generateQRCode(datos: QRData): Promise<string> {
  const jsonString = JSON.stringify(datos);
  const base64String = Buffer.from(jsonString).toString("base64");
  const url = `https://www.arca.gob.ar/fe/qr/?p=${base64String}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300 });
    return qrDataUrl;
  } catch (err) {
    return `${err}`;
  }
}
