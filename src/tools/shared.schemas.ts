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
