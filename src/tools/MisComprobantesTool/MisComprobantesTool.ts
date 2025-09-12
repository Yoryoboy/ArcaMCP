import { MCPResponse } from "../../core/types.js";
import afip from "../../services/afip/client.js";
import config from "../../config.js";
import {
  MisComprobantesInputSchema,
} from "./MisComprobantesTool.schemas.js";

export class MisComprobantesTool {
  static readonly name = "mis_comprobantes";

  static readonly metadata = {
    title: "Listar comprobantes (Mis Comprobantes)",
    description:
      "Consulta el aplicativo 'Mis Comprobantes' de ARCA para descargar comprobantes emitidos o recibidos por un CUIT. Se requiere CUIT y password de ARCA (el username es el mismo CUIT). Los filtros son opcionales. Por defecto se espera a que finalice la automatización (wait=true) para no continuar hasta recibir la respuesta.",
    inputSchema: MisComprobantesInputSchema.shape,
  };

  static async execute(params: unknown): Promise<MCPResponse> {
    try {
      const input = MisComprobantesInputSchema.parse(params);
      const { filters, wait } = input;
      const { CUIT, PASSWORD } = config;

      const data = {
        cuit: CUIT,
        username: CUIT,
        password: PASSWORD,
        ...(filters ? { filters } : {}),
      } as const;

      const response = await (afip as any).CreateAutomation(
        "mis-comprobantes",
        data,
        wait ?? true
      );

      return {
        content: [
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
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
