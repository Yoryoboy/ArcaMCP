import { GetVoucherInfoSchema } from "./GetVoucherInfoTool.schemas.js";
import { GetVoucherInfoParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";

export class GetVoucherInfoTool {
  static readonly name = "get_voucher_info";

  static readonly metadata = {
    title: "Obtener información de comprobante",
    description: "Obtener información completa de un comprobante ya emitido en AFIP",
    inputSchema: GetVoucherInfoSchema.shape,
  };

  static async execute(params: GetVoucherInfoParams): Promise<MCPResponse> {
    try {
      const validatedParams = GetVoucherInfoSchema.parse(params);
      const { CbteNro, PtoVta, CbteTipo } = validatedParams;

      const result = await afip.ElectronicBilling.getVoucherInfo(
        CbteNro,
        PtoVta,
        CbteTipo
      );

      if (result === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { message: "El comprobante no existe" },
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
