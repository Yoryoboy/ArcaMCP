import { z } from "zod";

export const GetTaxpayerDetailsSchema = z.object({
  taxId: z.number().describe("CUIT del contribuyente a consultar"),
});
