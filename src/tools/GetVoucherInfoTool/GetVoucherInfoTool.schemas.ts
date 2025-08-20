import { z } from "zod";

export const GetVoucherInfoSchema = z.object({
  CbteNro: z.number().min(1).describe("Número de comprobante a consultar"),
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z
    .number()
    .min(1)
    .describe("Tipo de comprobante informado. Consultar FEParamGetTiposCbte"),
});
