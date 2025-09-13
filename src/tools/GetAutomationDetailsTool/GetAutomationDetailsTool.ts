import { MCPResponse } from "../../core/types.js";
import afip from "../../services/afip/client.js";
import { AutomationStartResponse } from "../MisComprobantesTool/MisComprobantesTool.types.js";
import {
  GetAutomationDetailsInput,
  GetAutomationDetailsInputSchema,
} from "./GetAutomationDetailsTool.schemas.js";
import { MisComprobantes } from "./GetAutomationDetailsTool.types.js";

export class GetAutomationDetailsTool {
  static readonly name = "get_automation_details";

  static readonly metadata = {
    title: "Obtener detalles de automatización",
    description:
      "Consulta el estado o el resultado final de una automatización previamente iniciada (p. ej., 'mis_comprobantes') usando su ID. Este tool SIEMPRE consulta en modo no bloqueante (wait=false). Si la automatización sigue en proceso, devolverá { id, status: 'in_process' }. Cuando finalice, devolverá los datos completos.",
    inputSchema: GetAutomationDetailsInputSchema.shape,
  };

  static async execute(
    params: GetAutomationDetailsInput
  ): Promise<MCPResponse> {
    try {
      const input = GetAutomationDetailsInputSchema.parse(params);
      const { id } = input;

      const response: AutomationStartResponse | MisComprobantes = await (
        afip as any
      ).GetAutomationDetails(id, false);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
