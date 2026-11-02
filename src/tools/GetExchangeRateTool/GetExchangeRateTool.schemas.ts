import { z } from "zod";

export const GetExchangeRateSchema = z.object({
  MonId: z
    .string()
    .describe("ID de la moneda a consultar (ej: 'DOL' para dólares)"),
  FchCotiz: z
    .string()
    .regex(/^\d{8}$/)
    .describe("Fecha de la cotización en formato AAAAMMDD (ej: '20250221')"),
});

// Resultado de FEParamGetCotizacion: el SDK lo tipa `any`, así que los campos son opcionales
// y se aceptan extras.
export const GetExchangeRateOutputSchema = z.looseObject({
  MonId: z.string().optional().describe("ID de la moneda consultada"),
  MonCotiz: z.number().optional().describe("Cotización de la moneda en pesos"),
  FchCotiz: z.string().optional().describe("Fecha de la cotización en formato AAAAMMDD"),
});
