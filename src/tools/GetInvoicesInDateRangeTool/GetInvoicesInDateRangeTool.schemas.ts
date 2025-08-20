import { z } from "zod";

export const GetInvoicesInDateRangeSchema = z.object({
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z.number().min(1).describe("Tipo de comprobante"),
  fechaDesde: z
    .string()
    .regex(/^\d{8}$/)
    .describe("Fecha desde en formato YYYYMMDD"),
  fechaHasta: z
    .string()
    .regex(/^\d{8}$/)
    .describe("Fecha hasta en formato YYYYMMDD"),
  batchSize: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Tamaño del lote para consultas paralelas (1-50, default: 20)"),
  maxVouchers: z
    .number()
    .min(1)
    .max(1000)
    .default(500)
    .describe("Límite máximo de comprobantes a procesar (1-1000, default: 500)"),
  includeDetails: z
    .boolean()
    .default(false)
    .describe("Incluir detalles completos de cada comprobante (default: false)"),
});
