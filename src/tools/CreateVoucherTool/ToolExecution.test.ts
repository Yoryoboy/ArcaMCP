import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const electronicBilling = {
    createVoucher: vi.fn(),
    createNextVoucher: vi.fn(),
    createPDF: vi.fn(),
    getSalesPoints: vi.fn(),
    getVoucherTypes: vi.fn(),
    getConceptTypes: vi.fn(),
    getDocumentTypes: vi.fn(),
    getAliquotTypes: vi.fn(),
    getCurrenciesTypes: vi.fn(),
    getOptionsTypes: vi.fn(),
    getTaxTypes: vi.fn(),
    getLastVoucher: vi.fn(),
    getVoucherInfo: vi.fn(),
    executeRequest: vi.fn(),
  };

  return {
    afip: {
      ElectronicBilling: electronicBilling,
      RegisterScopeThirteen: {
        getTaxpayerDetails: vi.fn(),
        getTaxIDByDocument: vi.fn(),
      },
      CreateAutomation: vi.fn(),
      GetAutomationDetails: vi.fn(),
    },
    config: {
      AFIP_PRODUCTION: true,
      CUIT: "20123456789",
      PASSWORD: "secret",
    },
    electronicBilling,
    findTemplate: vi.fn(),
    generateQRCode: vi.fn(),
  };
});

vi.mock("../../services/afip/client.js", () => ({
  default: mocks.afip,
}));

vi.mock("../../config.js", () => ({
  default: mocks.config,
}));

vi.mock("../../utils/qr/qr.js", () => ({
  generateQRCode: mocks.generateQRCode,
}));

vi.mock("../CreatePDFTool/CreatePDFTool.helpers.js", async () => {
  const actual = await vi.importActual<typeof import("../CreatePDFTool/CreatePDFTool.helpers.js")>(
    "../CreatePDFTool/CreatePDFTool.helpers.js",
  );

  return { ...actual, findTemplate: mocks.findTemplate };
});

import { CreateNextVoucherTool } from "../CreateNextVoucherTool/CreateNextVoucherTool.js";
import { CreatePDFTool } from "../CreatePDFTool/CreatePDFTool.js";
import { CreateVoucherTool } from "./CreateVoucherTool.js";
import { GetAliquotTypesTool } from "../GetAliquotTypesTool/GetAliquotTypesTool.js";
import { GetAutomationDetailsTool } from "../GetAutomationDetailsTool/GetAutomationDetailsTool.js";
import { GetConceptTypesTool } from "../GetConceptTypesTool/GetConceptTypesTool.js";
import { GetCuitFromDniTool } from "../GetCuitFromDniTool/GetCuitFromDniTool.js";
import { GetCurrenciesTypesTool } from "../GetCurrenciesTypesTool/GetCurrenciesTypesTool.js";
import { GetDocumentTypesTool } from "../GetDocumentTypesTool/GetDocumentTypesTool.js";
import { GetExchangeRateTool } from "../GetExchangeRateTool/GetExchangeRateTool.js";
import { GetLastVoucherTool } from "../GetLastVoucherTool/GetLastVoucherTool.js";
import { GetOptionsTypesTool } from "../GetOptionsTypesTool/GetOptionsTypesTool.js";
import { GetSalesPointsTool } from "../GetSalesPointsTool/GetSalesPointsTool.js";
import { GetTaxConditionTypesTool } from "../GetTaxConditionTypesTool/GetTaxConditionTypesTool.js";
import { GetTaxTypesTool } from "../GetTaxTypesTool/GetTaxTypesTool.js";
import { GetTaxpayerDetailsTool } from "../GetTaxpayerDetailsTool/GetTaxpayerDetailsTool.js";
import { GetVoucherInfoTool } from "../GetVoucherInfoTool/GetVoucherInfoTool.js";
import { GetVoucherTypesTool } from "../GetVoucherTypesTool/GetVoucherTypesTool.js";
import { MisComprobantesTool } from "../MisComprobantesTool/MisComprobantesTool.js";

const parseContent = (response: { content: Array<{ text: string }> }, index = 0) =>
  JSON.parse(response.content[index].text);

const voucherCore = {
  PtoVta: 1,
  CbteTipo: 11,
  Concepto: 1,
  DocTipo: 99,
  CbteFch: "20260614",
  ImpTotal: 121,
  ImpTotConc: 0,
  ImpNeto: 100,
  ImpOpEx: 0,
  ImpIVA: 21,
  ImpTrib: 0,
  MonId: "PES",
  MonCotiz: 1,
  CondicionIVAReceptorId: 5,
};

const voucherParams = {
  ...voucherCore,
  CantReg: 1,
  CbteDesde: 10,
  CbteHasta: 10,
};

const pdfParams = {
  CbteTipo: 11,
  CbteLetra: "C" as const,
  NOMBRE_EMISOR: "Owner Name",
  CUIT_EMISOR: "20123456789",
  DIRECCION_EMISOR: "Owner Address",
  CondicionIVAEmisor: "Monotributo",
  PtoVta: 1,
  CbteNro: 123,
  CbteFch: "20260614",
  MonId: "PES",
  MonCotiz: 1,
  DocNro: "20304050607",
  NOMBRE_RECEPTOR: "Recipient Name",
  CondicionIVAReceptor: "Consumidor Final",
  SUBTOTAL: 100,
  IMPORTE_TOTAL: 100,
  CAE_NUMBER: "12345678901234",
  CAE_EXPIRY_DATE: "20260630",
  INVOICE_ITEMS: [{ descripcion: "Consulting", cantidad: 1, precioUnitario: 100, importe: 100 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.AFIP_PRODUCTION = true;
  mocks.config.CUIT = "20123456789";
  mocks.config.PASSWORD = "secret";
});

describe("voucher creation tools", () => {
  it("returns AFIP responses for create_voucher and create_next_voucher", async () => {
    mocks.electronicBilling.createVoucher.mockResolvedValue({ CAE: "manual" });
    mocks.electronicBilling.createNextVoucher.mockResolvedValue({ CAE: "auto" });

    const createVoucherResponse = await CreateVoucherTool.execute({
      ...voucherParams,
      fullResponse: true,
    });
    const createNextVoucherResponse = await CreateNextVoucherTool.execute(voucherCore);

    expect(parseContent(createVoucherResponse)).toEqual({ CAE: "manual" });
    expect(parseContent(createNextVoucherResponse)).toEqual({ CAE: "auto" });
    expect(mocks.electronicBilling.createVoucher).toHaveBeenCalledWith(voucherParams, true);
    expect(mocks.electronicBilling.createNextVoucher).toHaveBeenCalledWith(voucherCore);
  });

  it.each([
    [CreateVoucherTool, { ...voucherParams, Iva: [], Tributos: [], CbtesAsoc: [], Opcionales: [] }, mocks.electronicBilling.createVoucher, false],
    [CreateNextVoucherTool, { ...voucherCore, Iva: [], Tributos: [], CbtesAsoc: [], Opcionales: [] }, mocks.electronicBilling.createNextVoucher, undefined],
  ])("removes empty arrays before calling AFIP for %p", async (tool, params, mockFn, fullResponse) => {
    mockFn.mockResolvedValue({ ok: true });

    await tool.execute(params);

    const cleanedParams = expect.not.objectContaining({
      Iva: expect.anything(),
      Tributos: expect.anything(),
      CbtesAsoc: expect.anything(),
      Opcionales: expect.anything(),
    });

    expect(mockFn).toHaveBeenCalledWith(
      cleanedParams,
      ...(fullResponse === undefined ? [] : [fullResponse]),
    );
  });

  it.each([
    [CreateVoucherTool, { ...voucherParams, fullResponse: false }],
    [CreateNextVoucherTool, voucherCore],
  ])("adds processed AFIP instructions when %p fails", async (tool, params) => {
    const afipError = { code: 10049, message: "(10049) Missing service dates" };
    const mockFn = tool === CreateVoucherTool ? mocks.electronicBilling.createVoucher : mocks.electronicBilling.createNextVoucher;
    mockFn.mockRejectedValue(afipError);

    const response = await tool.execute(params);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      details: afipError,
      instructions: expect.stringContaining("FchServDesde"),
    });
  });
});

describe("query tools", () => {
  const cases = [
    ["GetLastVoucherTool", () => GetLastVoucherTool.execute({ PtoVta: 1, CbteTipo: 11 }), mocks.electronicBilling.getLastVoucher, [{ CbteNro: 123 }, [1, 11], 123, { code: 500 }, { code: 500 }]],
    ["GetVoucherInfoTool", () => GetVoucherInfoTool.execute({ CbteNro: 123, PtoVta: 1, CbteTipo: 11 }), mocks.electronicBilling.getVoucherInfo, [{ CAE: "123" }, [123, 1, 11], { CAE: "123" }, new Error("voucher failed"), { error: "voucher failed", details: {} }]],
    ["GetExchangeRateTool", () => GetExchangeRateTool.execute({ MonId: "DOL", FchCotiz: "20260614" }), mocks.electronicBilling.executeRequest, [{ MonCotiz: 1200 }, ["FEParamGetCotizacion", { MonId: "DOL", FchCotiz: "20260614" }], { MonCotiz: 1200 }, new Error("rate failed"), { error: "rate failed", details: {} }]],
    ["GetVoucherTypesTool", () => GetVoucherTypesTool.execute(), mocks.electronicBilling.getVoucherTypes, [[{ Id: 11 }], [], [{ Id: 11 }], new Error("voucher types failed"), { error: "voucher types failed", details: {} }]],
    ["GetConceptTypesTool", () => GetConceptTypesTool.execute(), mocks.electronicBilling.getConceptTypes, [[{ Id: 1 }], [], [{ Id: 1 }], new Error("concept types failed"), { error: "concept types failed", details: {} }]],
    ["GetDocumentTypesTool", () => GetDocumentTypesTool.execute(), mocks.electronicBilling.getDocumentTypes, [[{ Id: 99 }], [], [{ Id: 99 }], new Error("document types failed"), { error: "document types failed", details: {} }]],
    ["GetAliquotTypesTool", () => GetAliquotTypesTool.execute(), mocks.electronicBilling.getAliquotTypes, [[{ Id: 5 }], [], [{ Id: 5 }], new Error("aliquot types failed"), { error: "aliquot types failed", details: {} }]],
    ["GetCurrenciesTypesTool", () => GetCurrenciesTypesTool.execute(), mocks.electronicBilling.getCurrenciesTypes, [[{ Id: "PES" }], [], [{ Id: "PES" }], new Error("currency types failed"), { error: "currency types failed", details: {} }]],
    ["GetOptionsTypesTool", () => GetOptionsTypesTool.execute(), mocks.electronicBilling.getOptionsTypes, [[{ Id: "2101" }], [], [{ Id: "2101" }], new Error("options failed"), { error: "options failed", details: {} }]],
    ["GetTaxTypesTool", () => GetTaxTypesTool.execute(), mocks.electronicBilling.getTaxTypes, [[{ Id: 1 }], [], [{ Id: 1 }], new Error("tax types failed"), { error: "tax types failed", details: {} }]],
    ["GetTaxConditionTypesTool", () => GetTaxConditionTypesTool.execute(), mocks.electronicBilling.executeRequest, [[{ Id: 5 }], ["FEParamGetCondicionIvaReceptor"], [{ Id: 5 }], new Error("tax condition failed"), { error: "tax condition failed", details: {} }]],
  ] as const;

  it.each(cases)("handles happy and error paths for %s", async (_, execute, mockFn, [result, args, expected, error, expectedError]) => {
    mockFn.mockResolvedValueOnce(result).mockRejectedValueOnce(error);

    const success = await execute();
    const failure = await execute();

    expect(parseContent(success)).toEqual(expected);
    expect(mockFn).toHaveBeenCalledWith(...args);
    expect(failure.isError).toBe(true);
    expect(parseContent(failure)).toEqual(expectedError);
  });

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

  it("handles happy and error paths for guarded tools in production", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxpayerDetails.mockResolvedValueOnce({ taxId: 20368506345 }).mockRejectedValueOnce(new Error("taxpayer failed"));
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument.mockResolvedValueOnce("20123456789").mockRejectedValueOnce(new Error("dni failed"));
    mocks.electronicBilling.getSalesPoints.mockResolvedValueOnce([{ nro: 1 }]).mockRejectedValueOnce(new Error("sales points failed"));

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
    expect(parseContent(salesPointsFailure)).toMatchObject({ error: "sales points failed", details: {} });
    expect(parseContent(salesPointsFailure)).toMatchObject({ note: expect.stringContaining("punto de venta 1") });
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

describe("CreatePDFTool", () => {
  it("creates PDFs with a mocked template and QR code", async () => {
    mocks.findTemplate.mockReturnValue("{{CbteLetra}}|{{NOMBRE_EMISOR}}|{{PtoVta}}|{{CbteNro}}|{{QR_CODE_DATA}}|{{INVOICE_ITEMS}}");
    mocks.generateQRCode.mockResolvedValue("data:image/png;base64,qr");
    mocks.electronicBilling.createPDF.mockResolvedValue({ file: "https://example.com/invoice.pdf" });

    const response = await CreatePDFTool.execute(pdfParams);

    expect(parseContent(response)).toMatchObject({ success: true, file: "https://example.com/invoice.pdf" });
    expect(mocks.generateQRCode).toHaveBeenCalledWith(expect.objectContaining({ fecha: "2026-06-14", codAut: 12345678901234 }));
    expect(mocks.electronicBilling.createPDF).toHaveBeenCalledWith(expect.objectContaining({ file_name: "Factura_C_00001_00000123", html: expect.stringContaining("data:image/png;base64,qr") }));
  });

  it("returns template errors before calling AFIP", async () => {
    mocks.findTemplate.mockImplementation(() => {
      throw new Error("No se encontró la plantilla HTML 'templates/bill.html'.");
    });

    const response = await CreatePDFTool.execute(pdfParams);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toEqual({
      success: false,
      error: "No se encontró la plantilla HTML 'templates/bill.html'.",
    });
    expect(mocks.electronicBilling.createPDF).not.toHaveBeenCalled();
  });

  it("returns AFIP PDF errors as JSON", async () => {
    mocks.findTemplate.mockReturnValue("{{QR_CODE_DATA}}");
    mocks.generateQRCode.mockResolvedValue("data:image/png;base64,qr");
    mocks.electronicBilling.createPDF.mockRejectedValue(new Error("pdf failed"));

    const response = await CreatePDFTool.execute(pdfParams);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toEqual({ success: false, error: "pdf failed" });
  });
});

describe("automation tools", () => {
  it("starts and inspects automation flows", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-1", status: "in_process" });
    mocks.afip.GetAutomationDetails.mockResolvedValue({ id: "auto-1", status: "completed" });

    const start = await MisComprobantesTool.execute({ t: "E", fechaEmision: "01/06/2026 - 30/06/2026", puntosVenta: [1], wait: true });
    const details = await GetAutomationDetailsTool.execute({ id: "auto-1", wait: true });

    expect(start.content[0].text).toContain("ID: auto-1");
    expect(parseContent(start, 1)).toEqual({ id: "auto-1", status: "in_process" });
    expect(parseContent(details)).toEqual({ id: "auto-1", status: "completed" });
    expect(mocks.afip.CreateAutomation).toHaveBeenCalledWith(
      "mis-comprobantes",
      expect.objectContaining({ cuit: "20123456789", username: "20123456789", password: "secret", filters: { t: "E", fechaEmision: "01/06/2026 - 30/06/2026", puntosVenta: [1] } }),
      false,
    );
    expect(mocks.afip.GetAutomationDetails).toHaveBeenCalledWith("auto-1", false);
  });

  it("only sends defined mis comprobantes filters and keeps async execution forced", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-2", status: "in_process" });

    await MisComprobantesTool.execute({
      t: "R",
      fechaEmision: "01/06/2026 - 30/06/2026",
      tipoDoc: 80,
      nroDoc: "20-12345678-9",
      wait: true,
    });

    expect(mocks.afip.CreateAutomation).toHaveBeenCalledWith(
      "mis-comprobantes",
      {
        cuit: "20123456789",
        username: "20123456789",
        password: "secret",
        filters: {
          t: "R",
          fechaEmision: "01/06/2026 - 30/06/2026",
          tipoDoc: 80,
          nroDoc: "20123456789",
        },
      },
      false,
    );
  });

  it("preserves explicitly empty filter arrays for mis comprobantes", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-3", status: "in_process" });

    await MisComprobantesTool.execute({
      t: "E",
      fechaEmision: "01/06/2026 - 30/06/2026",
      puntosVenta: [],
      tiposComprobantes: [],
    });

    expect(mocks.afip.CreateAutomation).toHaveBeenCalledWith(
      "mis-comprobantes",
      expect.objectContaining({
        filters: {
          t: "E",
          fechaEmision: "01/06/2026 - 30/06/2026",
          puntosVenta: [],
          tiposComprobantes: [],
        },
      }),
      false,
    );
  });

  it("forwards voucher ranges and authorization filters for mis comprobantes", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-4", status: "in_process" });

    await MisComprobantesTool.execute({
      t: "R",
      fechaEmision: "01/06/2026 - 30/06/2026",
      comprobanteDesde: 25,
      comprobanteHasta: 29,
      codigoAutorizacion: "12345678901234",
    });

    expect(mocks.afip.CreateAutomation).toHaveBeenCalledWith(
      "mis-comprobantes",
      {
        cuit: "20123456789",
        username: "20123456789",
        password: "secret",
        filters: {
          t: "R",
          fechaEmision: "01/06/2026 - 30/06/2026",
          comprobanteDesde: 25,
          comprobanteHasta: 29,
          codigoAutorizacion: "12345678901234",
        },
      },
      false,
    );
  });

  it("returns JSON errors for automation tools", async () => {
    mocks.afip.CreateAutomation.mockRejectedValue(new Error("automation failed"));
    mocks.afip.GetAutomationDetails.mockRejectedValue(new Error("details failed"));

    expect(parseContent(await MisComprobantesTool.execute({ t: "E", fechaEmision: "01/06/2026 - 30/06/2026" }))).toEqual({ success: false, error: "automation failed" });
    expect(parseContent(await GetAutomationDetailsTool.execute({ id: "auto-1" }))).toEqual({ success: false, error: "details failed" });
  });

  it("serializes non-Error automation failures for mis comprobantes", async () => {
    mocks.afip.CreateAutomation.mockRejectedValue("automation exploded");

    const response = await MisComprobantesTool.execute({
      t: "E",
      fechaEmision: "01/06/2026 - 30/06/2026",
    });

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toEqual({
      success: false,
      error: "automation exploded",
    });
  });
});
