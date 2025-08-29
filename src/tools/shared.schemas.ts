import { z } from "zod";

// Schema vacío para herramientas sin parámetros
export const EmptySchema = z.object({});

// Schemas compartidos para objetos anidados
export const IvaItemSchema = z.object({
  Id: z
    .number()
    .describe("Código de tipo de IVA. Consultar FEParamGetTiposIva"),
  BaseImp: z.number().describe("Base imponible para la determinación del IVA"),
  Importe: z
    .number()
    .describe("Importe del IVA. Para comprobantes tipo C debe ser = 0"),
});

export const TributoItemSchema = z.object({
  Id: z.number().describe("Código tributo. Consultar FEParamGetTiposTributos"),
  Desc: z.string().optional().describe("Descripción del tributo"),
  BaseImp: z.number().describe("Base imponible del tributo"),
  Alic: z.number().describe("Alícuota"),
  Importe: z.number().describe("Importe del tributo"),
});

export const ComprobantesAsociadosSchema = z.object({
  Tipo: z
    .number()
    .describe("Código de tipo de comprobante. Consultar FEParamGetTiposCbte"),
  PtoVta: z.number().describe("Punto de venta"),
  Nro: z.number().describe("Número de comprobante"),
  Cuit: z.string().optional().describe("CUIT emisor del comprobante"),
});

export const OpcionalesItemSchema = z.object({
  Id: z.string().describe("Identificador del campo opcional"),
  Valor: z.string().describe("Valor del campo opcional"),
});

// -----------------------------------------------------------------------------
// VoucherCoreSchema
// -----------------------------------------------------------------------------
// Esquema base común para ambos flujos: CreateVoucher y CreateNextVoucher.

export const VoucherCoreSchema = z.object({
  // Punto de venta: compartido por ambos flujos
  PtoVta: z
    .number()
    .min(1)
    .describe(
      "Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta. Para obtener puntos de venta disponibles, usar tool get_sales_points. Si el usuario no especifica, se tiene que obtener sus puntos de venta disponibles y pedirle que elija uno"
    ),

  // Tipo de comprobante: compartido por ambos flujos
  CbteTipo: z
    .number()
    .min(1)
    .describe(
      "Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo. Para obtener tipos de comprobante disponibles, usar tool get_voucher_types. Si el usuario no ha especificado el tipo de Factura, se tiene que obtener sus tipos de comprobante disponibles y recomendarle elegir uno."
    ),

  // Concepto: productos/servicios
  Concepto: z
    .number()
    .min(1)
    .max(3)
    .describe(
      "Concepto del comprobante. Valores permitidos: 1=Productos, 2=Servicios, 3=Productos y Servicios"
    ),

  // Documento del comprador
  DocTipo: z
    .number()
    .describe(
      "Código de documento del comprador. Ej: 80=CUIT, 96=DNI, 99=Consumidor Final. Se puede recuperar todos los tipos de documentos disponibles usando tool get_document_types"
    ),
  DocNro: z
    .number()
    .optional()
    .describe(
      "Número de identificación del comprador. Si el monto (ImpTotal) es por menos de 10000000 de pesos (10 millones) y es para consumidor Final, no es necesario declarar los datos del receptor del comprobante. (DocNro puede ser omitido)"
    ),

  // Fecha del comprobante
  CbteFch: z
    .string()
    .describe(
      "Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si el usuario no especifica, usar la fecha actual"
    ),

  // Totales monetarios
  ImpTotal: z
    .number()
    .min(0)
    .describe(
      "Importe total del comprobante. Fórmula: Importe no gravado + Importe exento + Importe neto gravado + IVA + tributos. Si el monto es por menos de 10000000 de pesos (10 millones) y es para consumidor Final, no es necesario declarar los datos del receptor del comprobante. (DocNro puede ser omitido)"
    ),
  ImpTotConc: z
    .number()
    .min(0)
    .describe(
      "Importe neto no gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Emisor Monotributista, corresponde al subtotal"
    ),
  ImpNeto: z
    .number()
    .min(0)
    .describe(
      "Importe neto gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C corresponde al Subtotal. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"
    ),
  ImpOpEx: z
    .number()
    .min(0)
    .describe(
      "Importe exento. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"
    ),
  ImpIVA: z
    .number()
    .min(0)
    .describe(
      "Suma de importes de IVA. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"
    ),
  ImpTrib: z.number().min(0).describe("Suma de los importes de tributos"),

  // Moneda
  MonId: z
    .string()
    .describe(
      "Código de moneda (ej: PES). Consultar método FEParamGetTiposMonedas"
    ),
  MonCotiz: z
    .number()
    .min(0)
    .describe("Cotización de la moneda. Para PES debe ser 1"),

  // Condición frente al IVA del receptor
  CondicionIVAReceptorId: z
    .number()
    .describe(
      "Condición de IVA del receptor. Para obtener las condiciones frente al IVA disponibles, usar tool get_tax_condition_types. Si el usuario no especifica, se tiene que obtener sus condiciones frente al IVA disponibles y recomendarle elegir una. Si el LLM tiene suficiente informacion para asumir la condicion frente al IVA, puede asumirla. Si el LLM no tiene suficiente informacion para asumir la condicion frente al IVA, debe preguntarle al usuario por esta informacion"
    ),

  // Fechas de servicio (obligatorias si concepto=2 o 3)
  FchServDesde: z
    .string()
    .optional()
    .describe(
      "Fecha inicio servicio (yyyyMMdd). Obligatorio si concepto=2 o 3. Si el usuario no especifica, se le debe preguntar por esta información. El LLM no debe asumir esa información"
    ),
  FchServHasta: z
    .string()
    .optional()
    .describe(
      "Fecha fin servicio (yyyyMMdd). Obligatorio si concepto=2 o 3. No menor a FchServDesde. Si el usuario no especifica, se le debe preguntar por esta información. El LLM no debe asumir esa información"
    ),
  FchVtoPago: z
    .string()
    .optional()
    .describe(
      "Fecha de vencimiento de pago (yyyyMMdd). Obligatorio si concepto=2 o 3. Posterior a CbteFch. Si el usuario no especifica, se le debe preguntar por esta información. El LLM no debe asumir esa información"
    ),

  // Listas opcionales
  Iva: z
    .array(IvaItemSchema)
    .optional()
    .describe(
      "Alícuotas e importes de IVA asociados. Para comprobantes tipo C y Bienes Usados – Monotributista no debe informarse"
    ),
  Tributos: z
    .array(TributoItemSchema)
    .optional()
    .describe("Tributos asociados al comprobante"),
  CbtesAsoc: z
    .array(ComprobantesAsociadosSchema)
    .optional()
    .describe("Comprobantes asociados"),
  Opcionales: z
    .array(OpcionalesItemSchema)
    .optional()
    .describe("Campos auxiliares reservados para usos futuros"),
});
