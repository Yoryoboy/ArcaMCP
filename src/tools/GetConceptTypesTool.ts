import { MCPResponse } from '../core/types.js';
import afip from '../services/afip/client.js';
import { EmptySchema } from './schemas.js';

export class GetConceptTypesTool {
  static readonly name = "get_concept_types";

  static readonly metadata = {
    title: "Obtener tipos de conceptos",
    description: "Obtiene los tipos de conceptos disponibles en AFIP (Productos, Servicios, Productos y Servicios).",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.getConceptTypes();
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
