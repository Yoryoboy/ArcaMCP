import { describe, expect, it } from "vitest";

import { getMocks, parseContent } from "./ToolExecution.test.helpers.js";
import { GetCuitFromDniTool } from "../GetCuitFromDniTool/GetCuitFromDniTool.js";
import { GetSalesPointsTool } from "../GetSalesPointsTool/GetSalesPointsTool.js";
import { GetTaxpayerDetailsTool } from "../GetTaxpayerDetailsTool/GetTaxpayerDetailsTool.js";

const mocks = getMocks();

describe("tools with environment guards", () => {
  it("returns dev guard guidance for testing-only AFIP endpoints", async () => {
    mocks.config.AFIP_PRODUCTION = false;

    const taxpayerResponse = await GetTaxpayerDetailsTool.execute({ taxId: 20368506345 });
    const cuitResponse = await GetCuitFromDniTool.execute({ nationalId: 12345678 });
    const salesPointsResponse = await GetSalesPointsTool.execute();

    expect(taxpayerResponse.isError).toBeUndefined();
    expect(parseContent(taxpayerResponse)).toMatchObject({
      message: expect.stringContaining("ambiente de testing"),
    });
    expect(parseContent(cuitResponse)).toMatchObject({
      message: expect.stringContaining("ambiente de testing"),
    });
    expect(parseContent(salesPointsResponse)).toMatchObject({
      message: expect.stringContaining("punto de venta 1 por defecto"),
    });
  });

  it("short-circuits CUIT lookup before schema validation in testing", async () => {
    mocks.config.AFIP_PRODUCTION = false;

    const response = await GetCuitFromDniTool.execute({} as never);

    expect(response.isError).toBeUndefined();
    expect(parseContent(response)).toMatchObject({
      message: expect.stringContaining("ambiente de testing"),
    });
  });

  it("handles happy and error paths for guarded tools in production", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxpayerDetails
      .mockResolvedValueOnce({ taxId: 20368506345 })
      .mockRejectedValueOnce(new Error("taxpayer failed"));
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument
      .mockResolvedValueOnce("20123456789")
      .mockRejectedValueOnce(new Error("dni failed"));
    mocks.electronicBilling.getSalesPoints
      .mockResolvedValueOnce([{ nro: 1 }])
      .mockRejectedValueOnce(new Error("sales points failed"));

    const taxpayerSuccess = await GetTaxpayerDetailsTool.execute({ taxId: 20368506345 });
    const cuitSuccess = await GetCuitFromDniTool.execute({ nationalId: 12345678 });
    const salesPointsSuccess = await GetSalesPointsTool.execute();
    const taxpayerFailure = await GetTaxpayerDetailsTool.execute({ taxId: 20368506345 });
    const cuitFailure = await GetCuitFromDniTool.execute({ nationalId: 12345678 });
    const salesPointsFailure = await GetSalesPointsTool.execute();

    expect(parseContent(taxpayerSuccess)).toEqual({ taxId: 20368506345 });
    expect(parseContent(cuitSuccess)).toBe("20123456789");
    expect(parseContent(salesPointsSuccess)).toEqual([{ nro: 1 }]);
    expect(parseContent(taxpayerFailure)).toEqual({ error: "taxpayer failed", details: {} });
    expect(parseContent(cuitFailure)).toEqual({ error: "dni failed", details: {} });
    expect(parseContent(salesPointsFailure)).toMatchObject({
      error: "sales points failed",
      details: {},
    });
    expect(parseContent(salesPointsFailure)).toMatchObject({
      note: expect.stringContaining("punto de venta 1"),
    });
  });

  it("returns a friendly message when DNI lookup has no CUIT match", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument.mockResolvedValue(null);

    const response = await GetCuitFromDniTool.execute({ nationalId: 12345678 });

    expect(parseContent(response)).toEqual({
      message: "No se encontró CUIT para el DNI proporcionado",
    });
  });

  it("preserves empty CUIT responses returned by AFIP", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument.mockResolvedValue("");

    const response = await GetCuitFromDniTool.execute({ nationalId: 12345678 });

    expect(parseContent(response)).toBe("");
  });
});
