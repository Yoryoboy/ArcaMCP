import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

const TOOL_NAMES = [
  "create_next_voucher",
  "create_pdf",
  "create_voucher",
  "get_aliquot_types",
  "get_automation_details",
  "get_certificate_status",
  "get_concept_types",
  "get_cuit_from_dni",
  "get_currencies_types",
  "get_document_types",
  "get_exchange_rate",
  "get_last_voucher",
  "get_options_types",
  "get_sales_points",
  "get_tax_condition_types",
  "get_tax_types",
  "get_taxpayer_details",
  "get_voucher_info",
  "get_voucher_types",
  "mis_comprobantes",
];

describe("MCP server", () => {
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  async function connect() {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer().connect(serverTransport);
    client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);
    return client;
  }

  it("registers every tool and the voucher prompt", async () => {
    const connected = await connect();
    const { tools } = await connected.listTools();
    const { prompts } = await connected.listPrompts();

    expect(tools.map((tool) => tool.name).sort()).toEqual(TOOL_NAMES);
    expect(prompts.map((prompt) => prompt.name)).toEqual(["wizard_crear_comprobante"]);
  });
});
