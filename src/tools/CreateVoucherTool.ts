import { MCPResponse } from "../core/types.js";
import { VoucherParams, AFIPVoucherResponse } from "./types.js";
import { VoucherSchema } from "./schemas.js";
import afip from "../services/afip/client.js";

export class CreateVoucherTool {
  static readonly name = "create_voucher";

  static readonly metadata = {
    title: "Crear comprobante electrónico",
    description: "Crear un comprobante electrónico en AFIP con CAE asignado",
    inputSchema: VoucherSchema.shape,
  };

  static async execute(params: VoucherParams): Promise<MCPResponse> {
    try {
      // Validar parámetros
      const validatedParams = VoucherSchema.parse(params);
      
      // Extraer el parámetro fullResponse y removerlo del objeto de datos
      const { fullResponse, ...voucherData } = validatedParams;

      // Crear el comprobante usando el SDK de AFIP con el segundo parámetro booleano
      const result = await afip.ElectronicBilling.createVoucher(
        voucherData,
        fullResponse || false
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
