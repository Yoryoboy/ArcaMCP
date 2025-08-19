import { z } from "zod";

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

// Schema base común para ambos tipos de comprobantes
export const BaseVoucherSchema = z.object({
  PtoVta: z
    .number()
    .min(1)
    .describe(
      "Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta"
    ),
  CbteTipo: z
    .number()
    .min(1)
    .describe(
      "Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo"
    ),
  Concepto: z
    .number()
    .min(1)
    .max(3)
    .describe(
      "Concepto del comprobante. Valores permitidos: 1=Productos, 2=Servicios, 3=Productos y Servicios"
    ),
  DocTipo: z
    .number()
    .describe(
      "Código de documento del comprador. Ej: 80=CUIT, 96=DNI, 99=Consumidor Final"
    ),
  DocNro: z.number().describe("Número de identificación del comprador"),
  CbteFch: z
    .string()
    .optional()
    .describe(
      "Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si no se envía, se asigna la fecha de proceso"
    ),
  ImpTotal: z
    .number()
    .min(0)
    .describe(
      "Importe total del comprobante. Fórmula: Importe no gravado + Importe exento + Importe neto gravado + IVA + tributos"
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
  MonId: z
    .string()
    .describe(
      "Código de moneda (ej: PES). Consultar método FEParamGetTiposMonedas"
    ),
  MonCotiz: z
    .number()
    .min(0)
    .describe("Cotización de la moneda. Para PES debe ser 1"),
  CondicionIVAReceptorId: z.number().describe("Condición de IVA del receptor"),
  FchServDesde: z
    .string()
    .optional()
    .describe(
      "Fecha inicio servicio (yyyyMMdd). Obligatorio si concepto=2 o 3"
    ),
  FchServHasta: z
    .string()
    .optional()
    .describe(
      "Fecha fin servicio (yyyyMMdd). Obligatorio si concepto=2 o 3. No menor a FchServDesde"
    ),
  FchVtoPago: z
    .string()
    .optional()
    .describe(
      "Fecha de vencimiento de pago (yyyyMMdd). Obligatorio si concepto=2 o 3. Posterior a CbteFch"
    ),
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

// Schema para createVoucher (con campos adicionales)
export const VoucherSchema = BaseVoucherSchema.extend({
  CantReg: z
    .number()
    .min(1)
    .describe(
      "Cantidad de registros del detalle del comprobante o lote de comprobantes de ingreso"
    ),
  CbteDesde: z
    .number()
    .min(1)
    .describe("Nro. de comprobante desde. Rango 1 – 99999999"),
  CbteHasta: z
    .number()
    .min(1)
    .describe("Nro. de comprobante hasta. Rango 1 – 99999999"),
  fullResponse: z
    .boolean()
    .optional()
    .describe(
      "Si es true, devuelve la respuesta completa del WS. Si es false o no se especifica, devuelve solo CAE y CAEFchVto"
    ),
});

// Schema para createNextVoucher (solo campos base)
export const NextVoucherSchema = BaseVoucherSchema;

// Schema para GetLastVoucherTool
export const GetLastVoucherSchema = z.object({
  PtoVta: z.number().describe("Punto de venta"),
  CbteTipo: z.number().describe("Tipo de comprobante"),
});

export const GetExchangeRateSchema = z.object({
  MonId: z
    .string()
    .describe("ID de la moneda a consultar (ej: 'DOL' para dólares)"),
  FchCotiz: z
    .string()
    .regex(/^\d{8}$/)
    .describe("Fecha de la cotización en formato AAAAMMDD (ej: '20250221')"),
});

export const GetVoucherInfoSchema = z.object({
  CbteNro: z.number().min(1).describe("Número de comprobante a consultar"),
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z
    .number()
    .min(1)
    .describe("Tipo de comprobante informado. Consultar FEParamGetTiposCbte"),
});

export const GetTaxpayerDetailsSchema = z.object({
  taxId: z.number().describe("CUIT del contribuyente a consultar"),
});

export const GetTaxIDByDocumentSchema = z.object({
  nationalId: z.number().describe("DNI del contribuyente"),
});

export const CreatePDFSchema = z.object({
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z.number().min(1).describe("Tipo de comprobante"),
  CbteNro: z.number().min(1).describe("Número de comprobante a generar PDF"),
  fileName: z.string().optional().describe("Nombre del archivo PDF (opcional)"),
});

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
  includeDetails: z
    .boolean()
    .default(false)
    .describe(
      "Incluir detalles completos de cada comprobante (default: false)"
    ),
  maxVouchers: z
    .number()
    .min(1)
    .max(1000)
    .default(500)
    .describe(
      "Límite máximo de comprobantes a procesar (1-1000, default: 500)"
    ),
});

// Schema vacío para herramientas sin parámetros
export const EmptySchema = z.object({});
