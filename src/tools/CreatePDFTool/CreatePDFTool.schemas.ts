import { z } from "zod";

const normalizeDate = (v: unknown) => {
  if (typeof v !== "string") return v as any;
  const s = v.trim();
  if (/^\d{8}$/.test(s))
    return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
};

export const InvoiceItemSchema = z.object({
  code: z.string().optional().describe("Código del producto/servicio"),
  description: z
    .string()
    .min(1, "Descripción requerida")
    .describe("Producto / Servicio"),
  quantity: z.number().min(0).optional().describe("Cantidad (default 1)"),
  unit: z.string().optional().describe("Unidad de medida (default 'Unidad')"),
  unitPrice: z.number().min(0).optional().describe("Precio unitario"),
  discountPercent: z.number().min(0).optional().describe("% Bonificación"),
  discountAmount: z.number().min(0).optional().describe("Importe bonificación"),
  subtotal: z
    .number()
    .min(0)
    .optional()
    .describe("Subtotal (si no se provee se calcula)"),
});

export const CreatePDFSchema = z.object({
  CbteNro: z.number().min(1).describe("Número de comprobante a generar PDF"),
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z.number().min(1).describe("Tipo de comprobante"),
  fileName: z.string().optional().describe("Nombre del archivo PDF (opcional)"),

  issuer: z
    .object({
      companyName: z
        .string()
        .optional()
        .describe("Nombre o razón social del emisor"),
      cuit: z
        .union([z.string(), z.number()])
        .optional()
        .describe("CUIT del emisor"),
      address: z.string().optional().describe("Domicilio comercial del emisor"),
      taxCondition: z
        .string()
        .optional()
        .describe("Condición frente al IVA del emisor"),
      grossIncome: z.string().optional().describe("Ingresos Brutos del emisor"),
      startDate: z
        .string()
        .optional()
        .transform(normalizeDate)
        .describe("Fecha de inicio de actividades del emisor"),
    })
    .optional(),

  recipient: z
    .object({
      name: z
        .string()
        .optional()
        .describe("Apellido y Nombre / Razón social del receptor"),
      cuit: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Documento del receptor (CUIT/CUIL/DNI)"),
      address: z.string().optional().describe("Domicilio del receptor"),
      taxCondition: z
        .string()
        .optional()
        .describe("Condición frente al IVA del receptor"),
    })
    .optional(),

  service: z
    .object({
      dateFrom: z
        .string()
        .optional()
        .transform(normalizeDate)
        .describe("Período facturado desde (yyyyMMdd o yyyy-MM-dd)"),
      dateTo: z
        .string()
        .optional()
        .transform(normalizeDate)
        .describe("Período facturado hasta (yyyyMMdd o yyyy-MM-dd)"),
      paymentDueDate: z
        .string()
        .optional()
        .transform(normalizeDate)
        .describe("Fecha de vencimiento para el pago (yyyyMMdd o yyyy-MM-dd)"),
    })
    .optional(),

  paymentCondition: z
    .string()
    .optional()
    .describe("Condición de venta (ej: Contado, Transferencia)"),

  items: z
    .array(InvoiceItemSchema)
    .optional()
    .describe("Ítems de la factura a renderizar"),
});
