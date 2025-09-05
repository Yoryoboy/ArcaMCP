import { GetCuitFromDniToolSchema } from "./GetCuitFromDniTool.schemas.js";
import { GetCuitFromDniToolParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";
import config from "src/config.js";
import { devEnvDetectedMessage } from "src/utils/helpers.js";

export class GetCuitFromDniTool {
  static readonly name = "get_cuit_from_dni";

  static readonly metadata = {
    title: "Obtener CUIT a partir de DNI",
    description: "Obtiene el CUIT de un contribuyente a partir de su DNI",
    inputSchema: GetCuitFromDniToolSchema.shape,
  };

  static async execute(params: GetCuitFromDniToolParams): Promise<MCPResponse> {
    if (!config.AFIP_PRODUCTION) {
      return devEnvDetectedMessage(
        "Se ha detectado que se encuentra en ambiente de testing. Este endpoint no funciona en ambiente de testing."
      );
    }
    try {
      const validatedParams = GetCuitFromDniToolSchema.parse(params);
      const { nationalId } = validatedParams;

      const result = await afip.RegisterScopeThirteen.getTaxIDByDocument(
        nationalId
      );

      if (result === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { message: "No se encontró CUIT para el DNI proporcionado" },
                null,
                2
              ),
            },
          ],
        };
      }

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
