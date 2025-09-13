import z from "zod";

export const GetAutomationDetailsInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe(
      "ID de la automatización retornado por 'mis_comprobantes'. Debe pegar aquí el ID para consultar el estado o recuperar el resultado final."
    ),
  wait: z
    .boolean()
    .default(false)
    .describe(
      "Ignorado: este tool siempre consulta en modo no bloqueante (wait=false). Si la automatización sigue en proceso, devolverá { id, status: 'in_process' }."
    ),
});

export type GetAutomationDetailsInput = z.infer<typeof GetAutomationDetailsInputSchema>;
