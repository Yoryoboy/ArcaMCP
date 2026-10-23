import { describe, expect, it } from "vitest";
import * as tools from "./index.js";

const readOnlyAfip = { readOnlyHint: true, openWorldHint: true };

const expected: Record<string, Record<string, boolean>> = {
  create_voucher: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  create_next_voucher: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  create_pdf: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  get_certificate_status: { readOnlyHint: true, openWorldHint: false },
  get_last_voucher: readOnlyAfip,
  get_voucher_info: readOnlyAfip,
  get_taxpayer_details: readOnlyAfip,
  get_cuit_from_dni: readOnlyAfip,
  get_sales_points: readOnlyAfip,
  get_voucher_types: readOnlyAfip,
  get_concept_types: readOnlyAfip,
  get_document_types: readOnlyAfip,
  get_aliquot_types: readOnlyAfip,
  get_currencies_types: readOnlyAfip,
  get_exchange_rate: readOnlyAfip,
  get_options_types: readOnlyAfip,
  get_tax_types: readOnlyAfip,
  get_tax_condition_types: readOnlyAfip,
  mis_comprobantes: readOnlyAfip,
  get_automation_details: readOnlyAfip,
};

describe("tool annotations", () => {
  const registered = Object.values(tools) as Array<{
    name: string;
    metadata: { annotations?: Record<string, boolean> };
  }>;

  it("covers every exported tool", () => {
    expect(registered.map((tool) => tool.name).sort()).toEqual(Object.keys(expected).sort());
  });

  it.each(Object.keys(expected))("declares the expected hints for %s", (name) => {
    const tool = registered.find((candidate) => candidate.name === name)!;

    expect(tool.metadata.annotations).toEqual(expected[name]);
  });
});
