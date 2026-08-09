import { describe, expect, it } from "vitest";

import { getMocks, parseContent } from "./ToolExecution.test.helpers.js";
import { GetAliquotTypesTool } from "../GetAliquotTypesTool/GetAliquotTypesTool.js";
import { GetConceptTypesTool } from "../GetConceptTypesTool/GetConceptTypesTool.js";
import { GetCurrenciesTypesTool } from "../GetCurrenciesTypesTool/GetCurrenciesTypesTool.js";
import { GetDocumentTypesTool } from "../GetDocumentTypesTool/GetDocumentTypesTool.js";
import { GetExchangeRateTool } from "../GetExchangeRateTool/GetExchangeRateTool.js";
import { GetLastVoucherTool } from "../GetLastVoucherTool/GetLastVoucherTool.js";
import { GetOptionsTypesTool } from "../GetOptionsTypesTool/GetOptionsTypesTool.js";
import { GetTaxConditionTypesTool } from "../GetTaxConditionTypesTool/GetTaxConditionTypesTool.js";
import { GetTaxTypesTool } from "../GetTaxTypesTool/GetTaxTypesTool.js";
import { GetVoucherInfoTool } from "../GetVoucherInfoTool/GetVoucherInfoTool.js";
import { GetVoucherTypesTool } from "../GetVoucherTypesTool/GetVoucherTypesTool.js";

const mocks = getMocks();

describe("catalog and query tools", () => {
  const cases = [
    [
      "GetLastVoucherTool",
      () => GetLastVoucherTool.execute({ PtoVta: 1, CbteTipo: 11 }),
      mocks.electronicBilling.getLastVoucher,
      [
        { CbteNro: 123 },
        [1, 11],
        123,
        { code: 500 },
        { success: false, kind: "afip_rejection", code: 500, details: { code: 500 } },
      ],
    ],
    [
      "GetVoucherInfoTool",
      () => GetVoucherInfoTool.execute({ CbteNro: 123, PtoVta: 1, CbteTipo: 11 }),
      mocks.electronicBilling.getVoucherInfo,
      [
        { CAE: "123" },
        [123, 1, 11],
        { CAE: "123" },
        new Error("voucher failed"),
        {
          success: false,
          error: "voucher failed",
          kind: "internal",
          details: { name: "Error", message: "voucher failed" },
        },
      ],
    ],
    [
      "GetExchangeRateTool",
      () => GetExchangeRateTool.execute({ MonId: "DOL", FchCotiz: "20260614" }),
      mocks.electronicBilling.executeRequest,
      [
        { MonCotiz: 1200 },
        ["FEParamGetCotizacion", { MonId: "DOL", FchCotiz: "20260614" }],
        { MonCotiz: 1200 },
        new Error("rate failed"),
        {
          success: false,
          error: "rate failed",
          kind: "internal",
          details: { name: "Error", message: "rate failed" },
        },
      ],
    ],
    [
      "GetVoucherTypesTool",
      () => GetVoucherTypesTool.execute(),
      mocks.electronicBilling.getVoucherTypes,
      [
        [{ Id: 11 }],
        [],
        [{ Id: 11 }],
        new Error("voucher types failed"),
        {
          success: false,
          error: "voucher types failed",
          kind: "internal",
          details: { name: "Error", message: "voucher types failed" },
        },
      ],
    ],
    [
      "GetConceptTypesTool",
      () => GetConceptTypesTool.execute(),
      mocks.electronicBilling.getConceptTypes,
      [
        [{ Id: 1 }],
        [],
        [{ Id: 1 }],
        new Error("concept types failed"),
        {
          success: false,
          error: "concept types failed",
          kind: "internal",
          details: { name: "Error", message: "concept types failed" },
        },
      ],
    ],
    [
      "GetDocumentTypesTool",
      () => GetDocumentTypesTool.execute(),
      mocks.electronicBilling.getDocumentTypes,
      [
        [{ Id: 99 }],
        [],
        [{ Id: 99 }],
        new Error("document types failed"),
        {
          success: false,
          error: "document types failed",
          kind: "internal",
          details: { name: "Error", message: "document types failed" },
        },
      ],
    ],
    [
      "GetAliquotTypesTool",
      () => GetAliquotTypesTool.execute(),
      mocks.electronicBilling.getAliquotTypes,
      [
        [{ Id: 5 }],
        [],
        [{ Id: 5 }],
        new Error("aliquot types failed"),
        {
          success: false,
          error: "aliquot types failed",
          kind: "internal",
          details: { name: "Error", message: "aliquot types failed" },
        },
      ],
    ],
    [
      "GetCurrenciesTypesTool",
      () => GetCurrenciesTypesTool.execute(),
      mocks.electronicBilling.getCurrenciesTypes,
      [
        [{ Id: "PES" }],
        [],
        [{ Id: "PES" }],
        new Error("currency types failed"),
        {
          success: false,
          error: "currency types failed",
          kind: "internal",
          details: { name: "Error", message: "currency types failed" },
        },
      ],
    ],
    [
      "GetOptionsTypesTool",
      () => GetOptionsTypesTool.execute(),
      mocks.electronicBilling.getOptionsTypes,
      [
        [{ Id: "2101" }],
        [],
        [{ Id: "2101" }],
        new Error("options failed"),
        {
          success: false,
          error: "options failed",
          kind: "internal",
          details: { name: "Error", message: "options failed" },
        },
      ],
    ],
    [
      "GetTaxTypesTool",
      () => GetTaxTypesTool.execute(),
      mocks.electronicBilling.getTaxTypes,
      [
        [{ Id: 1 }],
        [],
        [{ Id: 1 }],
        new Error("tax types failed"),
        {
          success: false,
          error: "tax types failed",
          kind: "internal",
          details: { name: "Error", message: "tax types failed" },
        },
      ],
    ],
    [
      "GetTaxConditionTypesTool",
      () => GetTaxConditionTypesTool.execute(),
      mocks.electronicBilling.executeRequest,
      [
        [{ Id: 5 }],
        ["FEParamGetCondicionIvaReceptor"],
        [{ Id: 5 }],
        new Error("tax condition failed"),
        {
          success: false,
          error: "tax condition failed",
          kind: "internal",
          details: { name: "Error", message: "tax condition failed" },
        },
      ],
    ],
  ] as const;

  it.each(cases)(
    "handles happy and error paths for %s",
    async (_, execute, mockFn, [result, args, expected, error, expectedError]) => {
      mockFn.mockResolvedValueOnce(result).mockRejectedValueOnce(error);

      const success = await execute();
      const failure = await execute();

      expect(parseContent(success)).toEqual(expected);
      expect(mockFn).toHaveBeenCalledWith(...args);
      expect(failure.isError).toBe(true);
      expect(parseContent(failure)).toMatchObject(expectedError);
    },
  );

  it("returns a friendly message when voucher info does not exist", async () => {
    mocks.electronicBilling.getVoucherInfo.mockResolvedValue(null);

    const response = await GetVoucherInfoTool.execute({ CbteNro: 123, PtoVta: 1, CbteTipo: 11 });

    expect(parseContent(response)).toEqual({ message: "El comprobante no existe" });
  });

  it("preserves empty voucher info payloads instead of treating them as missing", async () => {
    mocks.electronicBilling.getVoucherInfo.mockResolvedValue({});

    const response = await GetVoucherInfoTool.execute({ CbteNro: 123, PtoVta: 1, CbteTipo: 11 });

    expect(parseContent(response)).toEqual({});
  });
});
