import { z } from "zod";

// Args del prompt: todos opcionales y de tipo string, según requisito del SDK MCP
// (PromptArgsRawShape: ZodString u opcional). El asistente debe parsear y validar.
export const CreateVoucherPromptArgsSchema = z.object({
  metodo: z
    .string()
    .optional()
    .describe(
      "Método de numeración. 'automatico' usa create_next_voucher. 'manual' usa create_voucher y requiere CbteDesde/CbteHasta."
    ),

  // Datos comerciales básicos
  concepto: z
    .string()
    .optional()
    .describe("Concepto del comprobante: 1=Productos, 2=Servicios, 3=Productos y Servicios"),
  cbteTipo: z
    .string()
    .optional()
    .describe(
      "Tipo de comprobante (ej: 11=Factura C). Si se omite, el asistente debe usar la tool get_voucher_types para listar y solicitar elección."
    ),
  ptoVta: z
    .string()
    .optional()
    .describe(
      "Punto de venta. Si se omite, el asistente debe usar get_sales_points; en testing puede continuar con 1 por defecto."
    ),

  // Moneda
  monId: z
    .string()
    .optional()
    .describe("Código de moneda (ej: PES, DOL, EUR). Si se omite, usar PES."),
  monCotiz: z
    .string()
    .optional()
    .describe(
      "Cotización de la moneda. Para PES es 1. Si MonId != PES y no se provee, el asistente debe obtenerla con get_exchange_rate (fecha = CbteFch)."
    ),

  // Identificación del receptor
  docTipo: z
    .string()
    .optional()
    .describe(
      "Código de documento del comprador (99=Consumidor Final, 96=DNI, 80=CUIT). Si se omite, el asistente puede sugerir 99 para consumidor final."
    ),
  docNro: z
    .string()
    .optional()
    .describe(
      "Número de documento del comprador. Si es Consumidor Final y el monto es < $10.000.000 ARS, puede omitirse."
    ),
  condicionIVAReceptorId: z
    .string()
    .optional()
    .describe(
      "Condición de IVA del receptor (ej: 5=Consumidor Final, 6=Responsable Monotributo, 1=IVA Responsable Inscripto, 4=IVA Sujeto Exento). Si se omite, el asistente debe usar get_tax_condition_types para listar y pedir elección."
    ),

  // Fechas
  cbteFch: z
    .string()
    .optional()
    .describe(
      "Fecha del comprobante (yyyyMMdd). Si se omite, usar la fecha actual. Para concepto=1: +/-5 días; para 2 o 3: +/-10 días."
    ),
  fchServDesde: z
    .string()
    .optional()
    .describe(
      "Fecha inicio de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. Si falta, el asistente debe solicitarla."
    ),
  fchServHasta: z
    .string()
    .optional()
    .describe(
      "Fecha fin de servicio (yyyyMMdd). Obligatoria si concepto=2 o 3. No menor a fchServDesde. Si falta, solicitarla."
    ),
  fchVtoPago: z
    .string()
    .optional()
    .describe(
      "Fecha de vencimiento de pago (yyyyMMdd). Obligatoria si concepto=2 o 3 y debe ser >= cbteFch. Si falta, solicitarla."
    ),

  // Importes principales (como texto; el asistente debe parsear a número)
  impTotal: z
    .string()
    .optional()
    .describe(
      "Importe total. Para Factura C: ImpTotal = ImpNeto + ImpTrib. Si no se provee, el asistente debe calcularlo según reglas."
    ),
  impNeto: z
    .string()
    .optional()
    .describe(
      "Importe neto. En Factura C corresponde al Subtotal. Si no se provee, el asistente debe inferirlo del monto o ítems."
    ),
  impTrib: z
    .string()
    .optional()
    .describe("Suma de tributos (por defecto 0 si no aplica)"),

  // Manual numbering extras (solo si metodo = manual)
  cantReg: z.string().optional().describe("Cantidad de registros (por defecto 1)"),
  cbteDesde: z
    .string()
    .optional()
    .describe("Número de comprobante desde (requerido en modo manual)"),
  cbteHasta: z
    .string()
    .optional()
    .describe("Número de comprobante hasta (requerido en modo manual)"),
});
