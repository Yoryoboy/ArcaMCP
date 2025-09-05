import { GetTaxIDByDocumentSchema } from "./GetTaxIDByDocumentTool.schemas.js";
import { GetTaxIDByDocumentParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";

export class GetCuitFromDniTool {
  static readonly name = "get_cuit_from_dni";

  static readonly metadata = {
    title: "Obtener CUIT a partir de DNI",
    description: "Obtiene el CUIT de un contribuyente a partir de su DNI",
    inputSchema: GetTaxIDByDocumentSchema.shape,
  };

  static async execute(params: GetTaxIDByDocumentParams): Promise<MCPResponse> {
    try {
      const validatedParams = GetTaxIDByDocumentSchema.parse(params);
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
