import { MCPResponse } from "../../core/types.js";
import afip from "../../services/afip/client.js";
import { EmptySchema } from "../shared.schemas.js";

export class GetAliquotTypesTool {
  static readonly name = "get_aliquot_types";

  static readonly metadata = {
    title: "Obtener tipos de alícuotas",
    description:
      "Obtiene los tipos de alícuotas de IVA disponibles en AFIP (0%, 10.5%, 21%, 27%, etc.).",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.getAliquotTypes();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
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
                error:
                  error instanceof Error ? error.message : "Error desconocido",
                details: error,
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
