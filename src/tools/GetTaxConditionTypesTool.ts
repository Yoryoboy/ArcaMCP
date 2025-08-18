import { MCPResponse } from '../core/types.js';
import afip from '../services/afip/client.js';
import { EmptySchema } from './schemas.js';

export class GetTaxConditionTypesTool {
  static readonly name = "get_tax_condition_types";

  static readonly metadata = {
    title: "Obtener tipos de condiciones IVA",
    description: "Obtiene los tipos de condiciones frente al IVA disponibles en AFIP (Responsable Inscripto, Monotributista, Exento, etc.).",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.executeRequest('FEParamGetCondicionIvaReceptor');
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
