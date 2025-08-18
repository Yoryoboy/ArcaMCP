import { MCPResponse } from '../core/types.js';
import afip from '../services/afip/client.js';
import { GetExchangeRateSchema } from './schemas.js';

export class GetExchangeRateTool {
  static readonly name = "get_exchange_rate";

  static readonly metadata = {
    title: "Obtener cotización de moneda",
    description: "Obtiene la cotización de una moneda específica para una fecha determinada desde AFIP.",
    inputSchema: GetExchangeRateSchema.shape,
  };

  static async execute(params: { MonId: string; FchCotiz: string }): Promise<MCPResponse> {
    try {
      const validatedParams = GetExchangeRateSchema.parse(params);
      
      const result = await afip.ElectronicBilling.executeRequest('FEParamGetCotizacion', {
        MonId: validatedParams.MonId,
        FchCotiz: validatedParams.FchCotiz
      });

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
