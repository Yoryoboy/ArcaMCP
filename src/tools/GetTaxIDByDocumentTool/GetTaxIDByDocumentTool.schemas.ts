import { z } from "zod";

export const GetTaxIDByDocumentSchema = z.object({
  nationalId: z.number().describe("DNI del contribuyente"),
});
