import { MCPResponse } from "../../core/types.js";
import afip from "../../services/afip/client.js";
import { GetExchangeRateSchema } from "./GetExchangeRateTool.schemas.js";
import { GetExchangeRateParams } from "../types.js";
import { executeJsonTool } from "../toolExecution.helpers.js";

export class GetExchangeRateTool {
  static readonly name = "get_exchange_rate";

  static readonly metadata = {
    title: "Obtener cotización de moneda",
    description:
      "Obtiene la cotización de una moneda específica para una fecha determinada desde AFIP.",
    inputSchema: GetExchangeRateSchema.shape,
  };

  static async execute(params: GetExchangeRateParams): Promise<MCPResponse> {
    return executeJsonTool({
      params,
      schema: GetExchangeRateSchema,
      invoke: async (validatedParams) =>
        afip.ElectronicBilling.executeRequest("FEParamGetCotizacion", {
          MonId: validatedParams.MonId,
          FchCotiz: validatedParams.FchCotiz,
        }),
    });
  }
}
