import { MCPResponse } from "../../core/types.js";
import { AFIPLastVoucherResponse, GetLastVoucherParams } from "../types.js";
import { GetLastVoucherSchema } from "./GetLastVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";

export class GetLastVoucherTool {
  static readonly name = "get_last_voucher";

  static readonly metadata = {
    title: "Obtener número último comprobante creado",
    description: "Obtener número último comprobante creado",
    inputSchema: GetLastVoucherSchema.shape,
  };

  /**
   * Ejecuta la consulta del último comprobante
   */
  static async execute(params: GetLastVoucherParams): Promise<MCPResponse> {
    try {
      // 1. Realizar consulta a AFIP
      const lastVoucher: AFIPLastVoucherResponse =
        await afip.ElectronicBilling.getLastVoucher(
          params.PtoVta,
          params.CbteTipo
        );

      // 2. Extraer número del comprobante
      const FECompUltimoAutorizadoResult = lastVoucher.CbteNro || lastVoucher;

      // 3. Formatear respuesta exitosa
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(FECompUltimoAutorizadoResult, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(error, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
}
