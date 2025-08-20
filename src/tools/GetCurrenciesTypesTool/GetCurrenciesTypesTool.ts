import { MCPResponse } from '../../core/types.js';
import afip from '../../services/afip/client.js';
import { EmptySchema } from '../shared.schemas.js';

export class GetCurrenciesTypesTool {
  static readonly name = "get_currencies_types";

  static readonly metadata = {
    title: "Obtener tipos de monedas",
    description: "Obtiene los tipos de monedas disponibles en AFIP (ARS, USD, EUR, etc.).",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.getCurrenciesTypes();
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
