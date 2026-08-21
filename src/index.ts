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
  CreatePDFTool,
  GetCuitFromDniTool,
  MisComprobantesTool,
  GetAutomationDetailsTool,
  GetCertificateStatusTool,
} from "./tools/index.js";
import { CreateVoucherPrompt } from "./prompts/index.js";
import { createCertificatePreflight } from "./services/certificate/certificatePreflight.js";
import { certificateDependentTools } from "./services/certificate/certificateToolInventory.js";
import { getDefaultCertificateStatus } from "./services/afip/client.js";

const server = new McpServer({
  name: "MonotributoMCP",
  version: "1.0.0",
});

const certificatePreflight = createCertificatePreflight(getDefaultCertificateStatus());
function registerTool(
  tool: { name: string; metadata: any; execute: (...args: any[]) => Promise<any> },
  requiresCertificate = certificateDependentTools.has(tool.name),
) {
  server.registerTool(
    tool.name,
    tool.metadata,
    certificatePreflight.wrap(tool.execute, requiresCertificate),
  );
}

registerTool(GetLastVoucherTool);
registerTool(CreateVoucherTool);
registerTool(CreateNextVoucherTool);
registerTool(GetVoucherInfoTool);
registerTool(GetTaxpayerDetailsTool);
registerTool(GetCuitFromDniTool);
registerTool(CreatePDFTool);
registerTool(GetSalesPointsTool);
registerTool(GetVoucherTypesTool);
registerTool(GetConceptTypesTool);
registerTool(GetDocumentTypesTool);
registerTool(GetAliquotTypesTool);
registerTool(GetCurrenciesTypesTool);
registerTool(GetExchangeRateTool);
registerTool(GetOptionsTypesTool);
registerTool(GetTaxTypesTool);
registerTool(GetTaxConditionTypesTool);
registerTool(MisComprobantesTool);
registerTool(GetAutomationDetailsTool);
registerTool(GetCertificateStatusTool, false);

server.registerPrompt(CreateVoucherPrompt.name, CreateVoucherPrompt.metadata, (args) =>
  CreateVoucherPrompt.build(args),
);

const transport = new StdioServerTransport();
await server.connect(transport);
