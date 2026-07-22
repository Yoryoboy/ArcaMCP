// ------------------------------
// Minimal input schema (step 1)
// ------------------------------
// Notes:
// - Accept numbers or strings for IDs, normalize to string internally to avoid precision/format issues.
// - Dates: input as YYYYMMDD; we show DD/MM/YYYY in PDF and use YYYY-MM-DD for QR.
// - Currency: format using es-AR.

import z from "zod";

const IdAsString = z.union([z.string(), z.number()]).transform((v) => String(v));

const InvoiceItemSchema = z.object({
  descripcion: z
    .string()
    .min(1)
    .describe(
      "Descripción específica del ítem (producto/servicio). No inventar descripciones genéricas. Si el usuario no lo ha especificado, preguntar explícitamente y no asumir la información.",
    ),
  cantidad: z.number().min(0).default(1).describe("Cantidad del ítem. Preguntarle al usuario"),
  precioUnitario: z
    .number()
    .min(0)
    .default(0)
    .describe("Precio unitario del ítem. Preguntarle al usuario"),
  importe: z.number().min(0).describe("Importe del ítem. Preguntarle al usuario"),
});

export const CreatePDFInputBaseSchema = z
  .object({
    // Emisor
    CbteTipo: z
      .number()
      .int()
      .min(1)
      .describe(
        "Código numérico del tipo de comprobante según AFIP (por ejemplo, Factura C = 11). Este valor se utiliza para propósitos técnicos como la generación del QR y debe obtenerse con el tool get_voucher_types. IMPORTANTE: Para la letra que se muestra en el PDF (A/B/C/M), usar el campo CbteLetra.",
      ),
    CbteLetra: z
      .enum(["A", "B", "C", "M"])
      .describe(
        "Letra del comprobante para visualización en el PDF (A/B/C/M). No utilizar aquí el Id numérico devuelto por get_voucher_types. Si sólo se dispone de la descripción (p. ej., 'Factura C'), extraer la letra (C). Se define CbteLetra separado de CbteTipo para evitar ambigüedad: CbteTipo es el código numérico para AFIP/QR, mientras que CbteLetra es únicamente la representación visual en el PDF.",
      ),
    Concepto: z
      .union([z.literal(1), z.literal(2), z.literal(3)])
      .describe("Concepto del comprobante: 1=Productos, 2=Servicios, 3=Productos y Servicios"),
    CondicionIVAEmisor: z
      .string()
      .refine((value) => value.trim().length > 0, {
        message: "CondicionIVAEmisor no puede estar vacío",
      })
      .describe(
        "Condición frente al IVA del emisor. Si el usuario no lo ha especificado, se deberá encontrar las opciones disponibles utilizando el tool get_tax_condition_types y se le deberá preguntar al usuario. Esta información nunca debe ser asumida, tiene que ser confirmada por el usuario.",
      ),
    INGRESOS_BRUTOS: z
      .discriminatedUnion("condicion", [
        z
          .object({ condicion: z.literal("Local"), numeroInscripcion: z.string().trim().min(1) })
          .strict(),
        z
          .object({
            condicion: z.literal("Convenio Multilateral"),
            numeroInscripcion: z.string().trim().min(1),
          })
          .strict(),
        z
          .object({ condicion: z.literal("Exento"), numeroInscripcion: z.never().optional() })
          .strict(),
        z
          .object({
            condicion: z.literal("No contribuyente"),
            numeroInscripcion: z.never().optional(),
          })
          .strict(),
      ])
      .describe(
        "Condición obligatoria de Ingresos Brutos; Local y Convenio Multilateral requieren inscripción.",
      ),
    FECHA_INICIO_ACTIVIDADES: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Fecha legal de inicio de actividades en formato YYYY-MM-DD"),

    // Comprobante
    PtoVta: z
      .number()
      .int()
      .min(1)
      .describe(
        "Punto de venta del comprobante. Se le debe agregar '0000' al inicio. Por ejemplo, si es 2, se pone '00002'",
      ),
    CbteNro: z.number().int().min(1).describe("Número del comprobante"),
    CbteFch: z
      .string()
      .regex(/^\d{8}$/)
      .describe("Fecha del comprobante"), // YYYYMMDD
    // Moneda
    MonId: z.string().min(3).default("PES").describe("Código de moneda (ej: PES)"),
    MonCotiz: z.number().min(0).default(1).describe("Cotización moneda"),

    // Receptor
    // @third-party
    DocNro: IdAsString.optional()
      .transform((v) => {
        const s = v === undefined || v === null ? "" : String(v).trim();
        // Normalizamos "0" o cadenas compuestas solo por ceros a vacío explícito
        return s === "0" || /^0+$/.test(s) ? "" : s;
      })
      .refine((v) => v === "" || /^\d{11}$/.test(v), {
        message:
          "DocNro debe ser CUIL/CUIT de 11 dígitos o bien vacío explícito si no corresponde declarar receptor.",
      })
      .describe(
        "Número de documento del receptor (CUIL/CUIT). Debe ser de 11 dígitos, sin puntos ni guiones. Si no corresponde declarar receptor, dejar explícitamente en blanco (string vacío). Este schema normaliza 0 o cadenas de solo ceros ('000...') a vacío. No inventar números. Si el usuario no lo ha especificado y es necesario, preguntar: el LLM no debe asumir esta información.",
      ),
    NOMBRE_RECEPTOR: z
      .string()
      .min(1)
      .describe(
        "Nombre del receptor. En caso de no ser necesario declarar el receptor, se puede omitir. Dejar espacio en blanco",
      ),
    CondicionIVAReceptor: z
      .string()
      .min(1)
      .describe("En caso de ser consumidor final, simplemente poner 'Consumidor Final'"),
    DIRECCION_RECEPTOR: z
      .string()
      .optional()
      .describe(
        "Dirección del receptor. En caso de no ser necesario declarar el receptor, se puede omitir. Dejar espacio en blanco. Si es necesario declarar el receptor, se puede encontrar la informacion del receptor usando el tool get_taxpayer_details",
      ),

    // Otros
    CONDICION_PAGO: z
      .enum([
        "Contado",
        "Efectivo",
        "Transferencia",
        "Depósito",
        "Tarjeta de Débito",
        "Tarjeta de Crédito",
        "Mercado Pago",
        "Billetera virtual",
        "Cheque",
        "Cuenta Corriente",
        "A crédito",
        "Contraentrega",
        "QR interoperable",
        "Otros",
      ])
      .default("Contado")
      .describe(
        "Condición de venta / medio de pago. Seleccionar una opción del enum: Contado, Efectivo, Transferencia, Depósito, Tarjeta de Débito, Tarjeta de Crédito, Mercado Pago, Billetera virtual, Cheque, Cuenta Corriente, A crédito, Contraentrega, QR interoperable u Otros. Si el usuario no lo ha especificado, preguntarle y no asumir esta información.",
      ),
    FchServDesde: z
      .string()
      .regex(/^\d{8}$/)
      .optional()
      .describe(
        "Fecha de inicio de servicio. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio.",
      ),
    FchServHasta: z
      .string()
      .regex(/^\d{8}$/)
      .optional()
      .describe(
        "Fecha de fin de servicio. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio.",
      ),
    FchVtoPago: z
      .string()
      .regex(/^\d{8}$/)
      .optional()
      .describe(
        "Fecha de vencimiento de pago. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio.",
      ),

    // Totales
    SUBTOTAL: z.number().min(0).describe("Subtotal de la factura"),
    IMPORTE_OTROS_TRIBUTOS: z.number().min(0).default(0).describe("Importe de otros tributos"),
    IMPORTE_TOTAL: z.number().min(0).describe("Importe total de la factura"),

    // CAE
    CAE_NUMBER: IdAsString.describe("Número de autorización del comprobante"),
    CAE_EXPIRY_DATE: z
      .string()
      .regex(/^\d{8}$/)
      .describe("Fecha de vencimiento de la autorización"),
    // Tipo de autorización del comprobante para QR: 'E' (CAE) o 'A' (CAEA)
    TipoCodAut: z
      .enum(["E", "A"])
      .default("E")
      .describe("Tipo de autorización del comprobante para QR: 'E' (CAE) o 'A' (CAEA)"),

    // Ítems de factura
    INVOICE_ITEMS: z.array(InvoiceItemSchema).optional().default([]).describe("Ítems de factura"),
  })
  .strict();

export const PublicObjectSchema = CreatePDFInputBaseSchema;
const legacyOwnerFields = ["CUIT_EMISOR", "NOMBRE_EMISOR", "DIRECCION_EMISOR"] as const;
const ProviderFieldsSchema = z.object({
  CUIT_EMISOR: z.string().regex(/^\d{11}$/),
  NOMBRE_EMISOR: z.string().trim().min(1),
  DIRECCION_EMISOR: z.string().trim().min(1),
});

function isCalendarDate(value: string): boolean {
  if (!/^\d{8}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function addDateIssue(
  context: z.RefinementCtx,
  path: "CbteFch" | "FECHA_INICIO_ACTIVIDADES" | "FchServDesde" | "FchServHasta" | "FchVtoPago",
  message: string,
) {
  context.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
}

function addLegacyIssues(raw: unknown, context: z.RefinementCtx): void {
  if (!raw || typeof raw !== "object") return;
  for (const field of legacyOwnerFields) {
    if (Object.prototype.hasOwnProperty.call(raw, field)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `${field} es un campo reservado y no puede ser enviado`,
      });
    }
  }
}

function addSharedIssues(
  input: z.infer<typeof PublicObjectSchema>,
  context: z.RefinementCtx,
): void {
  const activityDate = input.FECHA_INICIO_ACTIVIDADES.replaceAll("-", "");
  if (!isCalendarDate(activityDate)) {
    addDateIssue(
      context,
      "FECHA_INICIO_ACTIVIDADES",
      "FECHA_INICIO_ACTIVIDADES debe ser una fecha calendario válida en formato YYYY-MM-DD",
    );
  }

  if (!isCalendarDate(input.CbteFch)) {
    addDateIssue(
      context,
      "CbteFch",
      "CbteFch debe ser una fecha calendario válida en formato yyyyMMdd",
    );
  }

  const serviceDates = ["FchServDesde", "FchServHasta", "FchVtoPago"] as const;
  for (const field of serviceDates) {
    const value = input[field];
    if (value !== undefined && !isCalendarDate(value)) {
      addDateIssue(
        context,
        field,
        `${field} debe ser una fecha calendario válida en formato yyyyMMdd`,
      );
    }
  }

  if (input.Concepto === 2 || input.Concepto === 3) {
    for (const field of serviceDates) {
      if (input[field] === undefined) {
        addDateIssue(context, field, `${field} es obligatorio para Concepto ${input.Concepto}`);
      }
    }

    if (
      input.FchServDesde &&
      input.FchServHasta &&
      isCalendarDate(input.FchServDesde) &&
      isCalendarDate(input.FchServHasta) &&
      input.FchServHasta < input.FchServDesde
    ) {
      addDateIssue(context, "FchServHasta", "FchServHasta no puede ser anterior a FchServDesde");
    }

    if (
      input.FchVtoPago &&
      isCalendarDate(input.FchVtoPago) &&
      isCalendarDate(input.CbteFch) &&
      input.FchVtoPago < input.CbteFch
    ) {
      addDateIssue(context, "FchVtoPago", "FchVtoPago no puede ser anterior a CbteFch");
    }
  }
}

export const PublicRefinedSchema = z
  .unknown()
  .superRefine((raw, context) => {
    addLegacyIssues(raw, context);
    const result = PublicObjectSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) context.addIssue(issue);
      return;
    }
    addSharedIssues(result.data, context);
  })
  .transform((raw) => PublicObjectSchema.parse(raw));

export const ResolvedObjectSchema = PublicObjectSchema.merge(ProviderFieldsSchema).strict();
export const ResolvedRefinedSchema = ResolvedObjectSchema.superRefine((input, context) => {
  addSharedIssues(input, context);
});

export const CreatePDFInputSchema = PublicRefinedSchema;

export type CreatePDFPublicInput = z.infer<typeof PublicObjectSchema>;
export type CreatePDFResolvedInput = z.infer<typeof ResolvedObjectSchema>;
export type CreatePDFInput = CreatePDFResolvedInput;
