import { describe, expect, it } from "vitest";
import { connectClient, getMocks, textOf } from "./tools/protocol.test.helpers.js";

const mocks = getMocks();

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
  it("registers every tool and the voucher prompt", async () => {
    const connected = await connectClient();
    const { tools } = await connected.listTools();
    const { prompts } = await connected.listPrompts();

    expect(tools.map((tool) => tool.name).sort()).toEqual(TOOL_NAMES);
    expect(prompts.map((prompt) => prompt.name)).toEqual(["wizard_crear_comprobante"]);
  });

  it.each([
    ["get_voucher_types", mocks.electronicBilling.getVoucherTypes, [{ Id: 11, Desc: "Factura C" }]],
    ["get_concept_types", mocks.electronicBilling.getConceptTypes, [{ Id: 1, Desc: "Productos" }]],
    ["get_document_types", mocks.electronicBilling.getDocumentTypes, [{ Id: 80, Desc: "CUIT" }]],
    ["get_aliquot_types", mocks.electronicBilling.getAliquotTypes, [{ Id: 5, Desc: "21%" }]],
    [
      "get_currencies_types",
      mocks.electronicBilling.getCurrenciesTypes,
      [{ Id: "PES", Desc: "Pesos" }],
    ],
    ["get_options_types", mocks.electronicBilling.getOptionsTypes, [{ Id: "2101", Desc: "CBU" }]],
    ["get_tax_types", mocks.electronicBilling.getTaxTypes, [{ Id: 99, Desc: "Otro" }]],
    ["get_tax_condition_types", mocks.electronicBilling.executeRequest, [{ Id: 5, Desc: "CF" }]],
    ["get_sales_points", mocks.electronicBilling.getSalesPoints, [{ Nro: 1, EmisionTipo: "CAE" }]],
  ] as const)(
    "%s declares an output schema and returns its list as items",
    async (name, fetcher, items) => {
      fetcher.mockResolvedValue(items);
      const connected = await connectClient();

      const tool = (await connected.listTools()).tools.find((candidate) => candidate.name === name);
      const result = await connected.callTool({ name, arguments: {} });

      expect(tool?.outputSchema?.properties).toHaveProperty("items");
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ items });
      expect(textOf(result)).toEqual(items);
    },
  );

  it("returns the testing-environment notice of get_sales_points as structured content", async () => {
    mocks.config.AFIP_PRODUCTION = false;

    const result = await (
      await connectClient()
    ).callTool({ name: "get_sales_points", arguments: {} });

    expect(mocks.electronicBilling.getSalesPoints).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      message: expect.stringContaining("ambiente de testing"),
    });
  });

  it("does not validate error results against the output schema", async () => {
    mocks.electronicBilling.getVoucherTypes.mockRejectedValue(new Error("AFIP down"));

    const result = await (
      await connectClient()
    ).callTool({ name: "get_voucher_types", arguments: {} });

    expect(mocks.electronicBilling.getVoucherTypes).toHaveBeenCalledOnce();
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result).error).toBe("AFIP down");
  });
});
