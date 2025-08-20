import { VoucherCoreSchema } from "../shared.schemas.js";

// Si en el futuro NextVoucher necesitara campos extra o variaciones menores,
// se puede hacer: VoucherCoreSchema.extend({ ...differences })
export const NextVoucherSchema = VoucherCoreSchema;
