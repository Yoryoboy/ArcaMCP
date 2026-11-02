import { z } from "zod";

export const AutomationStartOutputSchema = z.looseObject({
  id: z.string().describe("ID de la automatización; usarlo con get_automation_details"),
  status: z.string().describe("Estado de la automatización, por ejemplo in_process o complete"),
});

export interface AutomationStartResponse {
  id: string;
  status: string; // expected values: 'in_process' | 'complete' (SDK may vary)
}
