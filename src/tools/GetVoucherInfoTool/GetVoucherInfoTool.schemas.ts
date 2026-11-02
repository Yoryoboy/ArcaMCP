import { z } from "zod";

export const GetVoucherInfoSchema = z.object({
  CbteNro: z.number().min(1).describe("Número de comprobante a consultar"),
  PtoVta: z.number().min(1).describe("Punto de venta del comprobante"),
  CbteTipo: z
    .number()
    .min(1)
    .describe("Tipo de comprobante informado. Consultar FEParamGetTiposCbte"),
});

// ResultGet de FECompConsultar: el SDK lo tipa `any`, así que los campos conocidos son
// opcionales y se aceptan los demás.
export const GetVoucherInfoOutputSchema = z.looseObject({
  message: z.string().optional().describe("Aviso cuando el comprobante no existe"),
  Concepto: z.number().optional().describe("Concepto del comprobante"),
  DocTipo: z.number().optional().describe("Código de documento del comprador"),
  DocNro: z.number().optional().describe("Número de documento del comprador"),
  CbteDesde: z.number().optional().describe("Número de comprobante desde"),
  CbteHasta: z.number().optional().describe("Número de comprobante hasta"),
  CbteFch: z.string().optional().describe("Fecha del comprobante en formato AAAAMMDD"),
  ImpTotal: z.number().optional().describe("Importe total del comprobante"),
  MonId: z.string().optional().describe("Código de la moneda"),
  MonCotiz: z.number().optional().describe("Cotización de la moneda"),
  Resultado: z.string().optional().describe("Resultado de AFIP: A=Aprobado, R=Rechazado"),
  CodAutorizacion: z.string().optional().describe("CAE del comprobante"),
  EmisionTipo: z.string().optional().describe("Tipo de emisión (CAE, CAEA)"),
  FchVto: z.string().optional().describe("Fecha de vencimiento del CAE en formato AAAAMMDD"),
  FchProceso: z.string().optional().describe("Fecha y hora de proceso en AFIP"),
  PtoVta: z.number().optional().describe("Punto de venta"),
  CbteTipo: z.number().optional().describe("Tipo de comprobante"),
});
