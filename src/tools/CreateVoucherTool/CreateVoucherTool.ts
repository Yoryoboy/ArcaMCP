import { MCPResponse } from "../../core/types.js";
import { VoucherParams } from "../types.js";
import { VoucherSchema } from "./CreateVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";

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

      // Filtrar arrays vacíos para evitar errores de AFIP
      const cleanedParams = { ...voucherData };
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

      // Crear el comprobante usando el SDK de AFIP con el segundo parámetro booleano
      const result = await afip.ElectronicBilling.createVoucher(
        cleanedParams,
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
