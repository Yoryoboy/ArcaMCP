import { z } from "zod";

export const GetCuitFromDniOutputSchema = z.looseObject({
  cuit: z.string().optional().describe("CUIT del contribuyente, en texto"),
  message: z
    .string()
    .optional()
    .describe("Aviso informativo cuando no hay CUIT para el DNI o no se consulta AFIP, por ejemplo en testing"),
});

export const GetCuitFromDniToolSchema = z.object({
  nationalId: z.number().describe("DNI del contribuyente"),
});
