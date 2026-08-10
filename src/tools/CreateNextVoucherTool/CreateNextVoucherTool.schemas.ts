import { VoucherCoreSchema, VoucherCoreShape } from "../shared.schemas.js";

// Shape plano (sin refinar) para metadata `.shape` e inferencia de tipos.
export const NextVoucherShape = VoucherCoreShape;

// Schema refinado para parsing: aplica la validación semántica del núcleo.
// create_next_voucher no numera manualmente, así que no lleva validación de rango.
// Si en el futuro NextVoucher necesitara campos extra o variaciones menores,
// se puede hacer: VoucherCoreShape.extend({ ...differences }).superRefine(...)
export const NextVoucherSchema = VoucherCoreSchema;
