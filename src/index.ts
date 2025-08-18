import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LastVoucherTool } from "./tools/LastVoucherTool.js";
import { CreateVoucherTool } from "./tools/CreateVoucherTool.js";
import { CreateNextVoucherTool } from "./tools/CreateNextVoucherTool.js";

const server = new McpServer({
  name: "MonotributoMCP",
  version: "1.0.0",
});

// Register all tools
server.registerTool(
  LastVoucherTool.name,
  LastVoucherTool.metadata,
  LastVoucherTool.execute
);

server.registerTool(
  CreateVoucherTool.name,
  CreateVoucherTool.metadata,
  CreateVoucherTool.execute
);

server.registerTool(
  CreateNextVoucherTool.name,
  CreateNextVoucherTool.metadata,
  CreateNextVoucherTool.execute
);

// Start STDIO transport
const transport = new StdioServerTransport();
await server.connect(transport);
