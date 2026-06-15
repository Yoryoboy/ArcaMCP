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
      [{ CbteNro: 123 }, [1, 11], 123, { code: 500 }, { code: 500 }],
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
        { error: "voucher failed", details: {} },
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
        { error: "rate failed", details: {} },
      ],
    ],
    [
      "GetVoucherTypesTool",
      () => GetVoucherTypesTool.execute(),
      mocks.electronicBilling.getVoucherTypes,
      [[{ Id: 11 }], [], [{ Id: 11 }], new Error("voucher types failed"), { error: "voucher types failed", details: {} }],
    ],
    [
      "GetConceptTypesTool",
      () => GetConceptTypesTool.execute(),
      mocks.electronicBilling.getConceptTypes,
      [[{ Id: 1 }], [], [{ Id: 1 }], new Error("concept types failed"), { error: "concept types failed", details: {} }],
    ],
    [
      "GetDocumentTypesTool",
      () => GetDocumentTypesTool.execute(),
      mocks.electronicBilling.getDocumentTypes,
      [[{ Id: 99 }], [], [{ Id: 99 }], new Error("document types failed"), { error: "document types failed", details: {} }],
    ],
    [
      "GetAliquotTypesTool",
      () => GetAliquotTypesTool.execute(),
      mocks.electronicBilling.getAliquotTypes,
      [[{ Id: 5 }], [], [{ Id: 5 }], new Error("aliquot types failed"), { error: "aliquot types failed", details: {} }],
    ],
    [
      "GetCurrenciesTypesTool",
      () => GetCurrenciesTypesTool.execute(),
      mocks.electronicBilling.getCurrenciesTypes,
      [[{ Id: "PES" }], [], [{ Id: "PES" }], new Error("currency types failed"), { error: "currency types failed", details: {} }],
    ],
    [
      "GetOptionsTypesTool",
      () => GetOptionsTypesTool.execute(),
      mocks.electronicBilling.getOptionsTypes,
      [[{ Id: "2101" }], [], [{ Id: "2101" }], new Error("options failed"), { error: "options failed", details: {} }],
    ],
    [
      "GetTaxTypesTool",
      () => GetTaxTypesTool.execute(),
      mocks.electronicBilling.getTaxTypes,
      [[{ Id: 1 }], [], [{ Id: 1 }], new Error("tax types failed"), { error: "tax types failed", details: {} }],
    ],
    [
      "GetTaxConditionTypesTool",
      () => GetTaxConditionTypesTool.execute(),
      mocks.electronicBilling.executeRequest,
      [[{ Id: 5 }], ["FEParamGetCondicionIvaReceptor"], [{ Id: 5 }], new Error("tax condition failed"), { error: "tax condition failed", details: {} }],
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
      expect(parseContent(failure)).toEqual(expectedError);
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
