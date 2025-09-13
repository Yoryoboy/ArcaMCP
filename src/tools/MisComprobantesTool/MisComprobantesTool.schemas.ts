import z from "zod";

// Username de ARCA = CUIT.
// En este tool pedimos CUIT y password explícitamente y construimos el username = CUIT.

const IdAsString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v));

// dd/mm/yyyy - dd/mm/yyyy
const FechaRangoRegex =
  /^(\d{2})\/(\d{2})\/(\d{4})\s-\s(\d{2})\/(\d{2})\/(\d{4})$/;

export const MisComprobantesInputObject = z.object({
  // Campos de filtros al nivel superior para mejorar UX en el Inspector
  t: z
    .enum(["E", "R"]) // E = Emitidos, R = Recibidos
    .describe(
      "Tipo de comprobantes: 'E' (Emitidos) o 'R' (Recibidos). Si el usuario no lo especifica, preguntarle y no asumir esta información."
    ),
  fechaEmision: z
    .string()
    .regex(FechaRangoRegex)
    .describe(
      "Rango de fecha de emisión en formato 'DD/MM/YYYY - DD/MM/YYYY'. Validar coherencia de fechas. Si no está especificado, preguntar."
    ),
  puntosVenta: z
    .array(z.number().int().min(1))
    .optional()
    .describe(
      "Lista de puntos de venta a filtrar. Si no se especifica, se incluyen todos."
    ),
  tiposComprobantes: z
    .array(z.number().int().min(1))
    .optional()
    .describe(
      "Lista de tipos de comprobantes (códigos AFIP, p. ej. 11=Factura C). Obtenerlos con el tool get_voucher_types."
    ),
  comprobanteDesde: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Número de comprobante desde (inclusive)."),
  comprobanteHasta: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Número de comprobante hasta (inclusive)."),
  tipoDoc: z
    .number()
    .optional()
    .describe(
      "Código de tipo de documento del receptor (p. ej., 80=CUIT). Usar get_document_types si se requiere."
    ),
  nroDoc: IdAsString.optional()
    .transform((v) => (v == null ? undefined : String(v).replace(/\D+/g, "")))
    .describe(
      "Número de documento del receptor. Sin puntos ni guiones (solo dígitos). Si no corresponde, omitir."
    ),
  codigoAutorizacion: z
    .string()
    .regex(/^\d{14}$/)
    .optional()
    .describe(
      "Código de autorización (CAE) de 14 dígitos. Si no corresponde, omitir."
    ),
  // Control de ejecución
  wait: z
    .boolean()
    .default(true)
    .describe(
      "Si es true, se espera a que la automatización complete y se devuelven los resultados. Por defecto true para no continuar hasta recibir la respuesta. Las credenciales (CUIT, username y password) se toman desde la configuración del servidor (config)."
    ),
});

export const MisComprobantesInputSchema = MisComprobantesInputObject.refine(
  (v) => {
    if (v.comprobanteDesde != null && v.comprobanteHasta != null) {
      return v.comprobanteDesde <= v.comprobanteHasta;
    }
    return true;
  },
  {
    message:
      "El rango de comprobantes es inválido: 'comprobanteDesde' debe ser menor o igual a 'comprobanteHasta'.",
    path: ["comprobanteDesde"],
  }
);

export type MisComprobantesInputParams = z.infer<
  typeof MisComprobantesInputSchema
>;
