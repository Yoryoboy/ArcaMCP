import {
  GetCuitFromDniOutputSchema,
  GetCuitFromDniToolSchema,
} from "./GetCuitFromDniTool.schemas.js";
import { GetCuitFromDniToolParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { messageResponse } from "../../core/structuredOutput.js";
import { MCPResponse } from "../../core/types.js";
import config from "../../config.js";
import { devEnvDetectedMessage } from "../../utils/helpers.js";
import { executeJsonTool } from "../toolExecution.helpers.js";
import { READ_ONLY_AFIP } from "../toolAnnotations.js";

export class GetCuitFromDniTool {
  static readonly name = "get_cuit_from_dni";

  static readonly metadata = {
    title: "Obtener CUIT a partir de DNI",
    description: "Obtiene el CUIT de un contribuyente a partir de su DNI",
    inputSchema: GetCuitFromDniToolSchema.shape,
    annotations: READ_ONLY_AFIP,
    outputSchema: GetCuitFromDniOutputSchema,
  };

  static async execute(params: GetCuitFromDniToolParams): Promise<MCPResponse> {
    return executeJsonTool({
      params,
      schema: GetCuitFromDniToolSchema,
      guard: () => {
        if (!config.AFIP_PRODUCTION) {
          return devEnvDetectedMessage(
            "Se ha detectado que se encuentra en ambiente de testing. Este endpoint no funciona en ambiente de testing."
          );
        }

        return null;
      },
      invoke: async (validatedParams) =>
        afip.RegisterScopeThirteen.getTaxIDByDocument(validatedParams.nationalId),
      structure: (cuit) => ({ cuit: String(cuit) }),
      onNullResult: () => messageResponse("No se encontró CUIT para el DNI proporcionado"),
    });
  }
}
