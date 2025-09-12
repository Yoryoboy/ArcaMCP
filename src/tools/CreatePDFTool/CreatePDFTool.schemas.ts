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
  descripcion: z
    .string()
    .min(1)
    .describe("Descripción del ítem. Preguntarle al usuario"),
  cantidad: z
    .number()
    .min(0)
    .default(1)
    .describe("Cantidad del ítem. Preguntarle al usuario"),
  precioUnitario: z
    .number()
    .min(0)
    .default(0)
    .describe("Precio unitario del ítem. Preguntarle al usuario"),
  importe: z
    .number()
    .min(0)
    .describe("Importe del ítem. Preguntarle al usuario"),
});

export const CreatePDFInputSchema = z.object({
  // Emisor
  CbteTipo: z
    .number()
    .int()
    .min(1)
    .describe(
      "Código numérico del tipo de comprobante según AFIP (por ejemplo, Factura C = 11). Este valor se utiliza para propósitos técnicos como la generación del QR y debe obtenerse con el tool get_voucher_types. IMPORTANTE: Para la letra que se muestra en el PDF (A/B/C/M), usar el campo CbteLetra."
    ),
  CbteLetra: z
    .enum(["A", "B", "C", "M"])
    .describe(
      "Letra del comprobante para visualización en el PDF (A/B/C/M). No utilizar aquí el Id numérico devuelto por get_voucher_types. Si sólo se dispone de la descripción (p. ej., 'Factura C'), extraer la letra (C). Se define CbteLetra separado de CbteTipo para evitar ambigüedad: CbteTipo es el código numérico para AFIP/QR, mientras que CbteLetra es únicamente la representación visual en el PDF."
    ),
  NOMBRE_EMISOR: z
    .string()
    .min(1)
    .describe(
      "Nombre del emisor. Se debe usar el nombre obtenido de get_taxpayer_details, keys: nombre y apellido"
    ),
  CUIT_EMISOR: IdAsString.describe("CUIT del emisor"),
  DIRECCION_EMISOR: z
    .string()
    .min(1)
    .describe(
      "Dirección del emisor, obtener de get_taxpayer_details, key: domicilio"
    ),
  CondicionIVAEmisor: z
    .string()
    .min(1)
    .describe(
      "Condición frente al IVA del emisor. Si el usuario no lo ha especificado, se deberá encontrar las opciones disponibles utilizando el tool get_tax_condition_types y se le deberá preguntar al usuario. Esta información nunca debe ser asumida, tiene que ser confirmada por el usuario."
    ),
  INGRESOS_BRUTOS: z
    .string()
    .optional()
    .default("")
    .describe(
      "En AFIP/ARCA el campo de Ingresos Brutos en una factura no es un campo fijo del servicio web (WSFEv1), sino que se suele completar dentro de los datos del emisor (como el número de inscripción en IIBB o la condición frente a ese impuesto). Las opciones más comunes que se usan en ese campo son: Exento (cuando el emisor no tributa Ingresos Brutos en ninguna jurisdicción), Convenio Multilateral (cuando el contribuyente está inscripto en varias jurisdicciones bajo ese régimen), Local (por ejemplo, “IIBB CABA”, “IIBB PBA”, indicando la inscripción provincial correspondiente con el número de padrón), No inscripto (en algunos sistemas aparece esta opción cuando el contribuyente aún no tiene inscripción). Para encontrar tu número de IIBB: si sos Monotributista, en la mayoría de los casos estás exento salvo inscripción de oficio; si sos Responsable Inscripto, debés consultar en la web de tu Agencia de Recaudación Provincial (ej. AGIP, ARBA); y si operás en varias provincias, probablemente estés en Convenio Multilateral, lo cual figura en el padrón de tu jurisdicción sede."
    ),
  FECHA_INICIO_ACTIVIDADES: z
    .string()
    .min(4)
    .optional()
    .default("")
    .describe(
      "Fecha de inicio de actividades. Si el usuario no lo ha especificado, se deberá encontrar las opciones disponibles utilizando el tool get_taxpayer_details, es el key periodoActividadPrincipal y viene en formato AAAA-MM. Ejemplo: 2022-01"
    ),

  // Comprobante
  PtoVta: z
    .number()
    .int()
    .min(1)
    .describe(
      "Punto de venta del comprobante. Se le debe agregar '0000' al inicio. Por ejemplo, si es 2, se pone '00002'"
    ),
  CbteNro: z.number().int().min(1).describe("Número del comprobante"),
  CbteFch: z
    .string()
    .regex(/^\d{8}$/)
    .describe("Fecha del comprobante"), // YYYYMMDD
  // Moneda
  MonId: z
    .string()
    .min(3)
    .default("PES")
    .describe("Código de moneda (ej: PES)"),
  MonCotiz: z.number().min(0).default(1).describe("Cotización moneda"),

  // Receptor
  DocNro: IdAsString
    .optional()
    .transform((v) => (v === undefined || v === null ? "" : String(v).trim()))
    .refine((v) => v === "" || /^\d{11}$/.test(v), {
      message:
        "DocNro debe ser CUIL/CUIT de 11 dígitos o bien vacío explícito si no corresponde declarar receptor.",
    })
    .describe(
      "Número de documento del receptor (CUIL/CUIT). Debe ser de 11 dígitos, sin puntos ni guiones. Si no corresponde declarar receptor, dejar explícitamente en blanco (string vacío). No inventar números. Si el usuario no lo ha especificado y es necesario, preguntar: el LLM no debe asumir esta información."
    ),
  NOMBRE_RECEPTOR: z
    .string()
    .min(1)
    .describe(
      "Nombre del receptor. En caso de no ser necesario declarar el receptor, se puede omitir. Dejar espacio en blanco"
    ),
  CondicionIVAReceptor: z
    .string()
    .min(1)
    .describe(
      "En caso de ser consumidor final, simplemente poner 'Consumidor Final'"
    ),
  DIRECCION_RECEPTOR: z
    .string()
    .optional()
    .describe(
      "Dirección del receptor. En caso de no ser necesario declarar el receptor, se puede omitir. Dejar espacio en blanco. Si es necesario declarar el receptor, se puede encontrar la informacion del receptor usando el tool get_taxpayer_details"
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
      "Condición de venta / medio de pago. Seleccionar una opción del enum: Contado, Efectivo, Transferencia, Depósito, Tarjeta de Débito, Tarjeta de Crédito, Mercado Pago, Billetera virtual, Cheque, Cuenta Corriente, A crédito, Contraentrega, QR interoperable u Otros. Si el usuario no lo ha especificado, preguntarle y no asumir esta información."
    ),
  FchServDesde: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe(
      "Fecha de inicio de servicio. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio."
    ),
  FchServHasta: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe(
      "Fecha de fin de servicio. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio."
    ),
  FchVtoPago: z
    .string()
    .regex(/^\d{8}$/)
    .optional()
    .describe(
      "Fecha de vencimiento de pago. En caso de no ser necesario declarar el servicio, se puede omitir. Dejar espacio en blanco. Lo ideal sería obtener la información del CAE al que se le está generando esta factura para obtener los datos de las fechas de inicio, fin y pago del servicio."
    ),

  // Totales
  SUBTOTAL: z.number().min(0).describe("Subtotal de la factura"),
  IMPORTE_OTROS_TRIBUTOS: z
    .number()
    .min(0)
    .default(0)
    .describe("Importe de otros tributos"),
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
    .describe(
      "Tipo de autorización del comprobante para QR: 'E' (CAE) o 'A' (CAEA)"
    ),

  // Ítems de factura
  INVOICE_ITEMS: z
    .array(InvoiceItemSchema)
    .optional()
    .default([])
    .describe("Ítems de factura"),
});

export type CreatePDFInput = z.infer<typeof CreatePDFInputSchema>;
