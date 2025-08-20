import { z } from "zod";
import {
  IvaItemSchema,
  TributoItemSchema,
  ComprobantesAsociadosSchema,
  OpcionalesItemSchema,
} from "../shared.schemas.js";

// Schema para createNextVoucher
export const NextVoucherSchema = z.object({
  PtoVta: z
    .number()
    .min(1)
    .describe(
      "Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta. Para obtener puntos de venta disponibles, usar tool get_sales_points. Si el usuario no especifica, se tiene que obtener sus puntos de venta disponibles y pedirle que elija uno"
    ),
  CbteTipo: z
    .number()
    .min(1)
    .describe(
      "Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo. Para obtener tipos de comprobante disponibles, usar tool get_voucher_types. Si el usuario no ha especificado el tipo de Factura, se tiene que obtener sus tipos de comprobante disponibles y recomendarle elegir uno."
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
  DocNro: z
    .number()
    .optional()
    .describe(
      "Número de identificación del comprador. Si es consumidor final, no debe informarse."
    ),
  CbteFch: z
    .string()
    .optional()
    .describe(
      "Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si el usuario no especifica, usar la fecha actual"
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
  CondicionIVAReceptorId: z
    .number()
    .describe(
      "Condición de IVA del receptor. Para obtener las condiciones frente al IVA disponibles, usar tool get_tax_condition_types. Si el usuario no especifica, se tiene que obtener sus condiciones frente al IVA disponibles y recomendarle elegir una. Si el LLM tiene suficiente informacion para asumir la condicion frente al IVA, puede asumirla. Si el LLM no tiene suficiente informacion para asumir la condicion frente al IVA, debe preguntarle al usuario por esta informacion"
    ),
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
