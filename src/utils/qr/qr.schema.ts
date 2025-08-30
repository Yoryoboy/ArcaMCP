import z from "zod";

// Zod schema for QR data following ARCA specification (version 1)
export const QRDataSchema = z.object({
  ver: z.literal(1).describe("Versión del formato de los datos"),

  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Fecha de emisión en formato YYYY-MM-DD"),

  cuit: z
    .number()
    .int()
    .min(10000000000)
    .max(99999999999)
    .describe("CUIT del emisor (11 dígitos)"),

  ptoVta: z.number().int().min(1).max(99999).describe("Punto de venta"),

  tipoCmp: z
    .number()
    .int()
    .min(1)
    .max(999)
    .describe("Tipo de comprobante según tablas AFIP"),

  nroCmp: z
    .number()
    .int()
    .min(1)
    .max(99999999)
    .describe("Número de comprobante"),

  importe: z.number().min(0).describe("Importe total en la moneda emitida"),

  moneda: z
    .string()
    .length(3)
    .describe("Moneda del comprobante según tablas AFIP"),

  ctz: z
    .number()
    .min(0)
    .describe("Cotización en pesos argentinos de la moneda utilizada"),

  tipoDocRec: z
    .number()
    .int()
    .min(1)
    .max(99)
    .optional()
    .describe("Código del tipo de documento del receptor"),

  nroDocRec: z
    .number()
    .int()
    .min(1)
    .max(99999999999999999999)
    .optional()
    .describe("Número de documento del receptor"),

  tipoCodAut: z
    .enum(["A", "E"])
    .describe("Tipo de código de autorización: A=CAEA, E=CAE"),
  codAut: z
    .number()
    .int()
    .min(10000000000000)
    .max(99999999999999)
    .describe("Código de autorización otorgado por ARCA"),
});
