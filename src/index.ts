import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { LastVoucherTool } from "./tools/LastVoucherTool.js";
import { CreateVoucherTool } from "./tools/CreateVoucherTool.js";
import { CreateNextVoucherTool } from "./tools/CreateNextVoucherTool.js";
import { GetSalesPointsTool } from "./tools/GetSalesPointsTool.js";
import { GetVoucherTypesTool } from "./tools/GetVoucherTypesTool.js";
import { GetConceptTypesTool } from "./tools/GetConceptTypesTool.js";
import { GetDocumentTypesTool } from "./tools/GetDocumentTypesTool.js";
import { GetAliquotTypesTool } from "./tools/GetAliquotTypesTool.js";
import { GetCurrenciesTypesTool } from "./tools/GetCurrenciesTypesTool.js";
import { GetExchangeRateTool } from "./tools/GetExchangeRateTool.js";
import { GetOptionsTypesTool } from "./tools/GetOptionsTypesTool.js";
import { GetTaxTypesTool } from "./tools/GetTaxTypesTool.js";
import { GetTaxConditionTypesTool } from "./tools/GetTaxConditionTypesTool.js";

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

server.registerTool(
  GetSalesPointsTool.name,
  GetSalesPointsTool.metadata,
  GetSalesPointsTool.execute
);

server.registerTool(
  GetVoucherTypesTool.name,
  GetVoucherTypesTool.metadata,
  GetVoucherTypesTool.execute
);

server.registerTool(
  GetConceptTypesTool.name,
  GetConceptTypesTool.metadata,
  GetConceptTypesTool.execute
);

server.registerTool(
  GetDocumentTypesTool.name,
  GetDocumentTypesTool.metadata,
  GetDocumentTypesTool.execute
);

server.registerTool(
  GetAliquotTypesTool.name,
  GetAliquotTypesTool.metadata,
  GetAliquotTypesTool.execute
);

server.registerTool(
  GetCurrenciesTypesTool.name,
  GetCurrenciesTypesTool.metadata,
  GetCurrenciesTypesTool.execute
);

server.registerTool(
  GetExchangeRateTool.name,
  GetExchangeRateTool.metadata,
  GetExchangeRateTool.execute
);

server.registerTool(
  GetOptionsTypesTool.name,
  GetOptionsTypesTool.metadata,
  GetOptionsTypesTool.execute
);

server.registerTool(
  GetTaxTypesTool.name,
  GetTaxTypesTool.metadata,
  GetTaxTypesTool.execute
);

server.registerTool(
  GetTaxConditionTypesTool.name,
  GetTaxConditionTypesTool.metadata,
  GetTaxConditionTypesTool.execute
);

// Start STDIO transport
const transport = new StdioServerTransport();
await server.connect(transport);
