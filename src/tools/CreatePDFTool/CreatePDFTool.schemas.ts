import { z } from "zod";

export const CreatePDFSchema = z.object({
  CbteNro: z.number().min(1).describe("Número de comprobante a generar PDF"),
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z.number().min(1).describe("Tipo de comprobante"),
  fileName: z.string().optional().describe("Nombre del archivo PDF (opcional)"),
});
