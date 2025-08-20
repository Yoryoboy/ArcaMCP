import { z } from "zod";

export const GetLastVoucherSchema = z.object({
  PtoVta: z.number().describe("Punto de venta"),
  CbteTipo: z.number().describe("Tipo de comprobante"),
});
