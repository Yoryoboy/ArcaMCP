import { jsonResponse } from "../../core/structuredOutput.js";
import { MCPResponse } from "../../core/types.js";
import { AFIPLastVoucherResponse, GetLastVoucherParams } from "../types.js";
import {
  GetLastVoucherOutputSchema,
  GetLastVoucherSchema,
} from "./GetLastVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";
import { toErrorResponse } from "../toolError.helpers.js";
import { READ_ONLY_AFIP } from "../toolAnnotations.js";

export class GetLastVoucherTool {
  static readonly name = "get_last_voucher";

  static readonly metadata = {
    title: "Obtener número último comprobante creado",
    description: "Obtener número último comprobante creado",
    inputSchema: GetLastVoucherSchema.shape,
    outputSchema: GetLastVoucherOutputSchema,
    annotations: READ_ONLY_AFIP,
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

      // 3. Formatear respuesta exitosa: el texto conserva el fallback al objeto
      // completo, pero CbteNro (incluido 0) siempre se informa estructurado
      if (typeof lastVoucher === "number") {
        return jsonResponse(FECompUltimoAutorizadoResult, { CbteNro: lastVoucher });
      }
      if (typeof lastVoucher.CbteNro === "number") {
        return jsonResponse(FECompUltimoAutorizadoResult, {
          CbteNro: lastVoucher.CbteNro,
        });
      }
      return jsonResponse(FECompUltimoAutorizadoResult);
    } catch (error) {
      return toErrorResponse(error);
    }
  }
}
