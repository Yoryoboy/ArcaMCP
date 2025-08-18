import { MCPResponse } from "../core/types.js";
import { NextVoucherParams } from "./types.js";
import { NextVoucherSchema } from "./schemas.js";
import afip from "../services/afip/client.js";

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
      // Validar parámetros
      const validatedParams = NextVoucherSchema.parse(params);

      // Crear el próximo comprobante usando el SDK de AFIP
      const result = await afip.ElectronicBilling.createNextVoucher(
        validatedParams
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
