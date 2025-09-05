import { z } from "zod";

export const GetCuitFromDniToolSchema = z.object({
  nationalId: z.number().describe("DNI del contribuyente"),
});
