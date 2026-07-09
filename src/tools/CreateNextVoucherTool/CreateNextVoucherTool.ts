import { MCPResponse } from "../../core/types.js";
import { NextVoucherSchema } from "./CreateNextVoucherTool.schemas.js";
import afip from "../../services/afip/client.js";
import { NextVoucherParams } from "../types.js";
import { executeVoucherTool } from "../voucherToolExecution.helpers.js";

export class CreateNextVoucherTool {
  static readonly name = "create_next_voucher";

  static readonly metadata = {
    title: "Crear próximo comprobante electrónico",
    description:
      "Crear el próximo comprobante electrónico en AFIP con numeración automática y CAE asignado.\n\n" +
      "Instrucciones para el asistente: Antes de ejecutar esta herramienta, entiende y valida exhaustivamente todos los parámetros requeridos según el tipo de comprobante a emitir (concepto, tipo de factura, moneda, punto de venta, importes, fechas, ítems, etc.). Si falta información o hay inconsistencias, solicita explícitamente los datos faltantes al usuario.\n\n" +
      "Recomendación clave: previo a usar esta herramienta, consulta los puntos de venta disponibles del usuario y asegúrate de recibir el número de punto de venta correcto (PtoVta).\n\n" +
      "Flujo sugerido: 1) Validar parámetros y completar faltantes preguntando al usuario. 2) Sugerir y/o consultar puntos de venta disponibles si no se proporcionó PtoVta. 3) Preparar y presentar un resumen claro y completo de la factura que se generará (todos los campos relevantes, importes y fechas). 4) Solicitar confirmación explícita del usuario. 5) Recién entonces proceder a crear el comprobante.\n\n" +
      "Atención: Mantente atento a cualquier notificación, instrucción adicional o preferencia que el usuario indique durante el proceso y ajústalo antes de ejecutar la herramienta.",
    inputSchema: NextVoucherSchema.shape,
  };

  static async execute(params: NextVoucherParams): Promise<MCPResponse> {
    return executeVoucherTool({
      params,
      schema: NextVoucherSchema,
      invoke: async ({ cleanedParams }) =>
        afip.ElectronicBilling.createNextVoucher(cleanedParams),
    });
  }
}
