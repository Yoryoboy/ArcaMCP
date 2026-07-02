import { GetVoucherInfoSchema } from "./GetVoucherInfoTool.schemas.js";
import { GetVoucherInfoParams } from "../types.js";
import afip from "../../services/afip/client.js";
import { MCPResponse } from "../../core/types.js";
import { executeJsonTool } from "../toolExecution.helpers.js";

export class GetVoucherInfoTool {
  static readonly name = "get_voucher_info";

  static readonly metadata = {
    title: "Obtener información de comprobante",
    description: "Obtener información completa de un comprobante ya emitido en AFIP",
    inputSchema: GetVoucherInfoSchema.shape,
  };

  static async execute(params: GetVoucherInfoParams): Promise<MCPResponse> {
    return executeJsonTool({
      params,
      schema: GetVoucherInfoSchema,
      invoke: async (validatedParams) =>
        afip.ElectronicBilling.getVoucherInfo(
          validatedParams.CbteNro,
          validatedParams.PtoVta,
          validatedParams.CbteTipo
        ),
      onNullResult: () => ({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "El comprobante no existe" }, null, 2),
          },
        ],
      }),
    });
  }
}
