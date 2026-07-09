import { MCPResponse } from "../../core/types.js";
import { VoucherParams } from "../types.js";
import { VoucherSchema } from "./CreateVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";
import { executeVoucherTool } from "../voucherToolExecution.helpers.js";

export class CreateVoucherTool {
  static readonly name = "create_voucher";

  static readonly metadata = {
    title: "Crear comprobante electrónico",
    description: "Crear un comprobante electrónico en AFIP con CAE asignado",
    inputSchema: VoucherSchema.shape,
  };

  static async execute(params: VoucherParams): Promise<MCPResponse> {
    return executeVoucherTool({
      params,
      schema: VoucherSchema,
      invoke: async ({ validatedParams, cleanedParams }) => {
        const { fullResponse } = validatedParams;
        const cleanedVoucherData = {
          ...cleanedParams,
        } as typeof cleanedParams & { fullResponse?: boolean };
        delete cleanedVoucherData.fullResponse;

        return afip.ElectronicBilling.createVoucher(
          cleanedVoucherData,
          fullResponse ?? false,
        );
      },
    });
  }
}
