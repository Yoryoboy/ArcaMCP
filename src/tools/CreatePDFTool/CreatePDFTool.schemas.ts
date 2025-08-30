// ------------------------------
// Minimal input schema (step 1)
// ------------------------------
// Notes:
// - Accept numbers or strings for IDs, normalize to string internally to avoid precision/format issues.
// - Dates: input as YYYYMMDD; we show DD/MM/YYYY in PDF and use YYYY-MM-DD for QR.
// - Currency: format using es-AR.

import z from "zod";

const IdAsString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v));

const InvoiceItemSchema = z.object({
  descripcion: z.string().min(1),
  cantidad: z.number().min(0).default(1),
  precioUnitario: z.number().min(0).default(0),
  importe: z.number().min(0),
});

export const CreatePDFInputSchema = z.object({
  // Emisor
  CbteTipo: z.number().int().min(1),
  NOMBRE_EMISOR: z.string().min(1),
  CUIT_EMISOR: IdAsString,
  DIRECCION_EMISOR: z.string().min(1),
  CondicionIVAEmisor: z.string().min(1),
  INGRESOS_BRUTOS: z.string().optional().default(""),
  FECHA_INICIO_ACTIVIDADES: z.string().min(4).optional().default(""),

  // Comprobante
  PtoVta: z.number().int().min(1),
  CbteNro: z.number().int().min(1),
  CbteFch: z.string().regex(/^\d{8}$/), // YYYYMMDD
  // Moneda
  MonId: z.string().min(3).default("PES"), // Código de moneda (ej: PES)
  MonCotiz: z.number().min(0).default(1), // Cotización moneda

  // Receptor
  DocNro: IdAsString.optional(),
  NOMBRE_RECEPTOR: z.string().min(1),
  CondicionIVAReceptor: z.string().min(1),
  DIRECCION_RECEPTOR: z.string().optional().default(""),

  // Otros
  CONDICION_PAGO: z.string().optional().default(""),
  FchServDesde: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),
  FchServHasta: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),
  FchVtoPago: z
    .string()
    .regex(/^\d{8}$/)
    .optional(),

  // Totales
  SUBTOTAL: z.number().min(0),
  IMPORTE_OTROS_TRIBUTOS: z.number().min(0).default(0),
  IMPORTE_TOTAL: z.number().min(0),

  // CAE
  CAE_NUMBER: IdAsString,
  CAE_EXPIRY_DATE: z.string().regex(/^\d{8}$/),
  // Tipo de autorización del comprobante para QR: 'E' (CAE) o 'A' (CAEA)
  TipoCodAut: z.enum(["E", "A"]).default("E"),

  // Ítems de factura
  INVOICE_ITEMS: z.array(InvoiceItemSchema).optional().default([]),
});

export type CreatePDFInput = z.infer<typeof CreatePDFInputSchema>;
