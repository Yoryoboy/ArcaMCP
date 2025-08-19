import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  GetLastVoucherTool,
  CreateVoucherTool,
  CreateNextVoucherTool,
  GetSalesPointsTool,
  GetVoucherTypesTool,
  GetConceptTypesTool,
  GetDocumentTypesTool,
  GetAliquotTypesTool,
  GetCurrenciesTypesTool,
  GetExchangeRateTool,
  GetOptionsTypesTool,
  GetTaxTypesTool,
  GetTaxConditionTypesTool,
  GetVoucherInfoTool,
  GetTaxpayerDetailsTool,
  GetTaxIDByDocumentTool,
  CreatePDFTool,
  GetInvoicesInDateRangeTool,
} from "./tools/index.js";

const server = new McpServer({
  name: "MonotributoMCP",
  version: "1.0.0",
});

// Register all tools
server.registerTool(
  GetLastVoucherTool.name,
  GetLastVoucherTool.metadata,
  GetLastVoucherTool.execute
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
  GetVoucherInfoTool.name,
  GetVoucherInfoTool.metadata,
  GetVoucherInfoTool.execute
);

server.registerTool(
  GetTaxpayerDetailsTool.name,
  GetTaxpayerDetailsTool.metadata,
  GetTaxpayerDetailsTool.execute
);

server.registerTool(
  GetTaxIDByDocumentTool.name,
  GetTaxIDByDocumentTool.metadata,
  GetTaxIDByDocumentTool.execute
);

server.registerTool(
  CreatePDFTool.name,
  CreatePDFTool.metadata,
  CreatePDFTool.execute
);

server.registerTool(
  GetInvoicesInDateRangeTool.name,
  GetInvoicesInDateRangeTool.metadata,
  GetInvoicesInDateRangeTool.execute
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
