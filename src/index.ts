import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import afip from "./services/afip/client.js";

// Create MCP server
const server = new McpServer({
  name: "MonotributoMCP",
  version: "1.0.0",
});

// Register basic test tool
server.registerTool(
  "ultimo_comprobante_creado",
  {
    title: "Obtener número último comprobante creado",
    description: "Obtener número último comprobante creado",
    inputSchema: {
      puntoDeVenta: z.number().describe("Punto de venta"),
      tipoDeComprobante: z.number().describe("Tipo de comprobante"),
    },
  },
  async ({ puntoDeVenta, tipoDeComprobante }) => {
    try {
      const lastVoucher = await afip.ElectronicBilling.getLastVoucher(
        puntoDeVenta,
        tipoDeComprobante
      );
      return {
        content: [
          {
            type: "text",
            text: `El número del último comprobante creado es el ${lastVoucher}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error al obtener el último comprobante: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start STDIO transport
const transport = new StdioServerTransport();
await server.connect(transport);
