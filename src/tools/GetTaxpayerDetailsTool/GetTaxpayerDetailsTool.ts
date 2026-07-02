import { GetTaxpayerDetailsSchema } from "./GetTaxpayerDetailsTool.schemas.js";
import { GetTaxpayerDetailsParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";
import config from "../../config.js";
import { devEnvDetectedMessage } from "../../utils/helpers.js";
import { PayerDetails } from "./GetTaxpayerDetailsTool.types.js";
import { executeJsonTool } from "../toolExecution.helpers.js";

export class GetTaxpayerDetailsTool {
  static readonly name = "get_taxpayer_details";

  static readonly metadata = {
    title: "Obtener datos del contribuyente",
    description:
      "Obtiene los datos completos de un contribuyente a partir de su CUIT",
    inputSchema: GetTaxpayerDetailsSchema.shape,
  };

  static async execute(params: GetTaxpayerDetailsParams): Promise<MCPResponse> {
    return executeJsonTool({
      params,
      schema: GetTaxpayerDetailsSchema,
      guard: () => {
        if (!config.AFIP_PRODUCTION) {
          return devEnvDetectedMessage(
            "Se ha detectado que se encuentra en ambiente de testing. Este endpoint no funciona en ambiente de testing. Pedirle al usuario un CUIT cualquiera para propósitos de testing, por ejemplo 20368506345"
          );
        }

        return null;
      },
      invoke: async (validatedParams) =>
        afip.RegisterScopeThirteen.getTaxpayerDetails(
          validatedParams.taxId
        ) as Promise<PayerDetails>,
    });
  }
}
