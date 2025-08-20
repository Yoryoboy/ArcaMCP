import { MCPResponse } from '../../core/types.js';
import afip from '../../services/afip/client.js';
import { EmptySchema } from '../shared.schemas.js';

export class GetSalesPointsTool {
  static readonly name = "get_sales_points";

  static readonly metadata = {
    title: "Obtener puntos de venta disponibles",
    description: "Obtiene los puntos de venta disponibles para facturación electrónica. En testing siempre devuelve error ya que no existen puntos de venta configurados (se usa punto de venta 1 por defecto).",
    inputSchema: EmptySchema.shape,
  };

  static async execute(): Promise<MCPResponse> {
    try {
      const result = await afip.ElectronicBilling.getSalesPoints();
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
            details: error,
            note: "En ambiente de testing es normal recibir error ya que no existen puntos de venta configurados. Se usa punto de venta 1 por defecto."
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}
