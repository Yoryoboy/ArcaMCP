import { MCPResponse } from "../core/types.js";
import { LastVoucherParams } from "./types.js";
import { LastVoucherSchema } from "./schemas.js";
import afip from "../services/afip/client.js";

export class LastVoucherTool {
  static readonly name = "ultimo_comprobante_creado";

  static readonly metadata = {
    title: "Obtener número último comprobante creado",
    description: "Obtener número último comprobante creado",
    inputSchema: LastVoucherSchema.shape,
  };

  /**
   * Ejecuta la consulta del último comprobante
   */
  static async execute(params: LastVoucherParams): Promise<MCPResponse> {
    try {
      // 1. Realizar consulta a AFIP
      const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
        params.puntoDeVenta,
        params.tipoDeComprobante
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
