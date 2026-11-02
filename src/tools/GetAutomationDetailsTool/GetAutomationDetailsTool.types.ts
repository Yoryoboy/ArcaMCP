import { z } from "zod";

// Rows come straight from ARCA's "Mis Comprobantes" table; all fields are optional and extra columns are accepted.
const TextOrNumber = z.union([z.string(), z.number()]).optional();

const ComprobanteOutputSchema = z.looseObject({
  "Fecha de Emisión": TextOrNumber.describe("Fecha de emisión"),
  "Tipo de Comprobante": TextOrNumber.describe("Tipo de comprobante"),
  "Punto de Venta": TextOrNumber.describe("Punto de venta"),
  "Número Desde": TextOrNumber.describe("Número de comprobante desde"),
  "Número Hasta": TextOrNumber.describe("Número de comprobante hasta"),
  "Cód. Autorización": TextOrNumber.describe("CAE"),
  "Tipo Doc. Receptor": TextOrNumber.describe("Tipo de documento del receptor"),
  "Nro. Doc. Receptor": TextOrNumber.describe("Número de documento del receptor"),
  "Denominación Receptor": TextOrNumber.describe("Denominación del receptor"),
  "Tipo Cambio": TextOrNumber.describe("Tipo de cambio"),
  Moneda: TextOrNumber.describe("Moneda"),
  "Imp. Neto Gravado": TextOrNumber.describe("Importe neto gravado"),
  "Imp. Neto No Gravado": TextOrNumber.describe("Importe neto no gravado"),
  "Imp. Op. Exentas": TextOrNumber.describe("Importe de operaciones exentas"),
  "Otros Tributos": TextOrNumber.describe("Otros tributos"),
  IVA: TextOrNumber.describe("IVA"),
  "Imp. Total": TextOrNumber.describe("Importe total"),
});

export const GetAutomationDetailsOutputSchema = z.looseObject({
  id: z.string().optional().describe("ID de la automatización"),
  status: z.string().optional().describe("Estado, por ejemplo in_process o complete"),
  data: z.array(ComprobanteOutputSchema).optional().describe("Comprobantes, sólo cuando la automatización terminó"),
});

export interface MisComprobantes {
  id: string;
  status: string;
  data: Comprobante[];
}

interface Comprobante {
  "Fecha de Emisión": Date;
  "Tipo de Comprobante": string;
  "Punto de Venta": string;
  "Número Desde": string;
  "Número Hasta": string;
  "Cód. Autorización": string;
  "Tipo Doc. Receptor": string;
  "Nro. Doc. Receptor": string;
  "Denominación Receptor": string;
  "Tipo Cambio": string;
  Moneda: string;
  "Imp. Neto Gravado": string;
  "Imp. Neto No Gravado": string;
  "Imp. Op. Exentas": string;
  "Otros Tributos": string;
  IVA: string;
  "Imp. Total": string;
}
