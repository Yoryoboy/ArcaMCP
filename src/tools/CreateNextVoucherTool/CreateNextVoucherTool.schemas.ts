import { z } from "zod";
import { VoucherCoreSchema, VoucherCoreShape } from "../shared.schemas.js";

// Shape plano (sin refinar) para metadata `.shape` e inferencia de tipos.
export const NextVoucherShape = VoucherCoreShape;

// Schema refinado para parsing: aplica la validación semántica del núcleo.
// create_next_voucher no numera manualmente, así que no lleva validación de rango.
// Si en el futuro NextVoucher necesitara campos extra o variaciones menores,
// se puede hacer: VoucherCoreShape.extend({ ...differences }).superRefine(...)
export const NextVoucherSchema = VoucherCoreSchema;

// Resultado de createNextVoucher: el SDK lo tipa `any`; los campos son opcionales y se aceptan extras.
export const NextVoucherOutputSchema = z.looseObject({
  CAE: z.string().optional().describe("Código de Autorización Electrónico asignado por AFIP"),
  CAEFchVto: z
    .string()
    .optional()
    .describe("Fecha de vencimiento del CAE en formato AAAAMMDD"),
  voucherNumber: z
    .number()
    .optional()
    .describe("Número de comprobante asignado automáticamente"),
});
