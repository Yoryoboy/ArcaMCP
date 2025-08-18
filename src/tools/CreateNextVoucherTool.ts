import { z } from "zod";
import { MCPResponse } from "../core/types.js";
import { NextVoucherParams } from "./types.js";
import afip from "../services/afip/client.js";

// Schema de validación para los parámetros del próximo voucher
const NextVoucherSchema = z.object({
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta"),
  CbteTipo: z.number().min(1).describe("Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo"),
  Concepto: z.number().min(1).max(3).describe("Concepto del comprobante. Valores permitidos: 1=Productos, 2=Servicios, 3=Productos y Servicios"),
  DocTipo: z.number().describe("Código de documento del comprador. Ej: 80=CUIT, 96=DNI, 99=Consumidor Final"),
  DocNro: z.number().describe("Número de identificación del comprador"),
  CbteFch: z.string().optional().describe("Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si no se envía, se asigna la fecha de proceso"),
  ImpTotal: z.number().min(0).describe("Importe total del comprobante. Fórmula: Importe no gravado + Importe exento + Importe neto gravado + IVA + tributos"),
  ImpTotConc: z.number().min(0).describe("Importe neto no gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Emisor Monotributista, corresponde al subtotal"),
  ImpNeto: z.number().min(0).describe("Importe neto gravado. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C corresponde al Subtotal. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"),
  ImpOpEx: z.number().min(0).describe("Importe exento. ≤ ImpTotal y ≥ 0. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"),
  ImpIVA: z.number().min(0).describe("Suma de importes de IVA. Para comprobantes tipo C debe ser = 0. Para Bienes Usados – Monotributista: no debe informarse o debe ser = 0"),
  ImpTrib: z.number().min(0).describe("Suma de los importes de tributos"),
  MonId: z.string().describe("Código de moneda (ej: PES). Consultar método FEParamGetTiposMonedas"),
  MonCotiz: z.number().min(0).describe("Cotización de la moneda. Para PES debe ser 1"),
  CondicionIVAReceptorId: z.number().describe("Condición de IVA del receptor"),
  FchServDesde: z.string().optional().describe("Fecha inicio servicio (yyyyMMdd). Obligatorio si concepto=2 o 3"),
  FchServHasta: z.string().optional().describe("Fecha fin servicio (yyyyMMdd). Obligatorio si concepto=2 o 3. No menor a FchServDesde"),
  FchVtoPago: z.string().optional().describe("Fecha de vencimiento de pago (yyyyMMdd). Obligatorio si concepto=2 o 3. Posterior a CbteFch"),
  Iva: z
    .array(
      z.object({
        Id: z.number().describe("Código de tipo de IVA. Consultar FEParamGetTiposIva"),
        BaseImp: z.number().describe("Base imponible para la determinación del IVA"),
        Importe: z.number().describe("Importe del IVA. Para comprobantes tipo C debe ser = 0"),
      })
    )
    .optional()
    .describe("Alícuotas e importes de IVA asociados. Para comprobantes tipo C y Bienes Usados – Monotributista no debe informarse"),
  Tributos: z
    .array(
      z.object({
        Id: z.number().describe("Código tributo. Consultar FEParamGetTiposTributos"),
        Desc: z.string().optional().describe("Descripción del tributo"),
        BaseImp: z.number().describe("Base imponible del tributo"),
        Alic: z.number().describe("Alícuota"),
        Importe: z.number().describe("Importe del tributo"),
      })
    )
    .optional()
    .describe("Tributos asociados al comprobante"),
  CbtesAsoc: z
    .array(
      z.object({
        Tipo: z.number().describe("Código de tipo de comprobante. Consultar FEParamGetTiposCbte"),
        PtoVta: z.number().describe("Punto de venta"),
        Nro: z.number().describe("Número de comprobante"),
        Cuit: z.string().optional().describe("CUIT emisor del comprobante"),
      })
    )
    .optional()
    .describe("Comprobantes asociados"),
  Opcionales: z
    .array(
      z.object({
        Id: z.string().describe("Identificador del campo opcional"),
        Valor: z.string().describe("Valor del campo opcional"),
      })
    )
    .optional()
    .describe("Campos auxiliares reservados para usos futuros"),
});

export class CreateNextVoucherTool {
  static readonly name = "create_next_voucher";

  static readonly metadata = {
    title: "Crear próximo comprobante electrónico",
    description:
      "Crear el próximo comprobante electrónico en AFIP con numeración automática y CAE asignado",
    inputSchema: NextVoucherSchema.shape,
  };

  static async execute(params: NextVoucherParams): Promise<MCPResponse> {
    try {
      // Validar parámetros
      const validatedParams = NextVoucherSchema.parse(params);

      // Crear el próximo comprobante usando el SDK de AFIP
      const result = await afip.ElectronicBilling.createNextVoucher(
        validatedParams
      );

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error:
                  error instanceof Error ? error.message : "Error desconocido",
                details: error,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
