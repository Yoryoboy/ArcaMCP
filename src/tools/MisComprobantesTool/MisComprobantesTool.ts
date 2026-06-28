import { MCPResponse } from "../../core/types.js";
import afip from "../../services/afip/client.js";
import config from "../../config.js";
import {
  MisComprobantesInputParams,
  MisComprobantesInputSchema,
  MisComprobantesInputObject,
} from "./MisComprobantesTool.schemas.js";
import { AutomationStartResponse } from "./MisComprobantesTool.types.js";
import { buildMisComprobantesAutomationData } from "./MisComprobantesTool.helpers.js";

export class MisComprobantesTool {
  static readonly name = "mis_comprobantes";

  static readonly metadata = {
    title: "Listar comprobantes (Mis Comprobantes)",
    description:
      "Inicia la automatización 'Mis Comprobantes' de ARCA para descargar comprobantes emitidos o recibidos por un CUIT. Este tool SIEMPRE ejecuta en modo asíncrono (wait=false) y devuelve sólo { id, status }. Para consultar el resultado final, usar el tool 'get_automation_details' con el id devuelto. Las credenciales (CUIT, username y password) se leen de la configuración.",
    inputSchema: MisComprobantesInputObject.shape,
  };

  static async execute(params: MisComprobantesInputParams): Promise<MCPResponse> {
    try {
      const input = MisComprobantesInputSchema.parse(params);
      const { CUIT, PASSWORD } = config;
      const data = buildMisComprobantesAutomationData(input, { CUIT, PASSWORD });

      const response: AutomationStartResponse = await (afip as any).CreateAutomation(
        "mis-comprobantes",
        data,
        false,
      );

      return {
        content: [
          {
            type: "text" as const,
            text: `Automatización iniciada. ID: ${response.id}. Status: ${response.status}. Darle al usuario el ID, para que luego pueda consultarlo.`,
          },
          {
            type: "text" as const,
            text: JSON.stringify(response, null, 2),
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
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
