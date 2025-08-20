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
