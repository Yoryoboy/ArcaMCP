import { MCPResponse } from '../core/types.js';
import afip from '../services/afip/client.js';
import { EmptySchema } from './schemas.js';

export class GetOptionsTypesTool {
  static readonly name = "get_options_types";

  static readonly metadata = {
    title: "Obtener tipos de opciones",
    description: "Obtiene los tipos de opciones disponibles para los comprobantes en AFIP.",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.getOptionsTypes();
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Error desconocido",
            details: error
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}
