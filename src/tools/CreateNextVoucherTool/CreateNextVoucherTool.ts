import { MCPResponse } from "../../core/types.js";
import { NextVoucherSchema } from "./CreateNextVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";
import { NextVoucherParams } from "../types.js";

export class CreateNextVoucherTool {
  static readonly name = "create_next_voucher";

  static readonly metadata = {
    title: "Crear próximo comprobante electrónico",
    description:
      "Crear el próximo comprobante electrónico en AFIP con numeración automática y CAE asignado",
    inputSchema: NextVoucherSchema.shape,
  };

  static async execute(params: NextVoucherParams): Promise<MCPResponse> {
    try {
      const validatedParams = NextVoucherSchema.parse(params);

      const cleanedParams = { ...validatedParams };
      if (cleanedParams.Iva && cleanedParams.Iva.length === 0) {
        delete cleanedParams.Iva;
      }
      if (cleanedParams.Tributos && cleanedParams.Tributos.length === 0) {
        delete cleanedParams.Tributos;
      }
      if (cleanedParams.CbtesAsoc && cleanedParams.CbtesAsoc.length === 0) {
        delete cleanedParams.CbtesAsoc;
      }
      if (cleanedParams.Opcionales && cleanedParams.Opcionales.length === 0) {
        delete cleanedParams.Opcionales;
      }

      const result = await afip.ElectronicBilling.createNextVoucher(
        cleanedParams
      );

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
