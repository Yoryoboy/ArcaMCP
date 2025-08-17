import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LastVoucherTool } from "./tools/LastVoucherTool.js";

const server = new McpServer({
  name: "MonotributoMCP",
  version: "1.0.0",
});

server.registerTool(
  LastVoucherTool.name,
  LastVoucherTool.metadata,
  LastVoucherTool.execute
);

// Start STDIO transport
const transport = new StdioServerTransport();
await server.connect(transport);
