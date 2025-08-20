import { z } from "zod";
import { VoucherCoreSchema } from "../shared.schemas.js";

// Schema para createVoucher (con campos adicionales)
export const VoucherSchema = VoucherCoreSchema.extend({
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
