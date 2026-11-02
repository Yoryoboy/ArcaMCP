import { z } from "zod";

export const GetLastVoucherSchema = z.object({
  PtoVta: z.number().describe("Punto de venta"),
  CbteTipo: z.number().describe("Tipo de comprobante"),
});

// El SDK de AFIP devuelve `any`: CbteNro se documenta como opcional y se aceptan campos extra.
export const GetLastVoucherOutputSchema = z.looseObject({
  CbteNro: z
    .number()
    .optional()
    .describe("Número del último comprobante autorizado (0 si aún no se emitió ninguno)"),
});
