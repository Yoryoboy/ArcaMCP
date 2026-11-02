import { VoucherCoreShape } from "../shared.schemas.js";
import {
  validateVoucherCoreSemantics,
  validateVoucherRangeSemantics,
} from "../voucherSemantics.js";
import { z } from "zod";

// Shape plano (sin refinar) para metadata `.shape` e inferencia de tipos.
export const VoucherShape = VoucherCoreShape.extend({
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

// Schema refinado para parsing: validación semántica del núcleo + rango de
// numeración manual. Es el que usa create_voucher al ejecutar.
export const VoucherSchema = VoucherShape.superRefine((data, ctx) => {
  validateVoucherCoreSemantics(data, ctx);
  validateVoucherRangeSemantics(data, ctx);
});

// Respuesta de FECAESolicitar: el SDK la tipa `any`, así que se documentan los campos
// conocidos como opcionales y se aceptan los demás.
export const VoucherOutputSchema = z.looseObject({
  CAE: z.string().optional().describe("Código de Autorización Electrónico asignado por AFIP"),
  CAEFchVto: z
    .string()
    .optional()
    .describe("Fecha de vencimiento del CAE en formato AAAAMMDD"),
  FeCabResp: z
    .looseObject({})
    .optional()
    .describe("Cabecera de la respuesta de AFIP (solo con fullResponse=true)"),
  FeDetResp: z
    .looseObject({})
    .optional()
    .describe("Detalle de la respuesta de AFIP (solo con fullResponse=true)"),
});
