import { GetTaxpayerDetailsSchema } from "./GetTaxpayerDetailsTool.schemas.js";
import { GetTaxpayerDetailsParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";

export class GetTaxpayerDetailsTool {
  static readonly name = "get_taxpayer_details";

  static readonly metadata = {
    title: "Obtener datos del contribuyente",
    description: "Obtiene los datos completos de un contribuyente a partir de su CUIT",
    inputSchema: GetTaxpayerDetailsSchema.shape,
  };

  static async execute(params: GetTaxpayerDetailsParams): Promise<MCPResponse> {
    try {
      const validatedParams = GetTaxpayerDetailsSchema.parse(params);
      const { taxId } = validatedParams;

      const result = await afip.RegisterScopeThirteen.getTaxpayerDetails(taxId);

      if (result === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { message: "El contribuyente no existe en el padrón" },
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
