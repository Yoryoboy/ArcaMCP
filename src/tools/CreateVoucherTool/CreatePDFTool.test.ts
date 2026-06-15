import { describe, expect, it } from "vitest";

import { getMocks, parseContent, pdfParams } from "./ToolExecution.test.helpers.js";
import { CreatePDFTool } from "../CreatePDFTool/CreatePDFTool.js";

const mocks = getMocks();

describe("CreatePDFTool", () => {
  it("creates PDFs with a mocked template and QR code", async () => {
    mocks.findTemplate.mockReturnValue(
      "{{CbteLetra}}|{{NOMBRE_EMISOR}}|{{PtoVta}}|{{CbteNro}}|{{QR_CODE_DATA}}|{{INVOICE_ITEMS}}",
    );
    mocks.generateQRCode.mockResolvedValue("data:image/png;base64,qr");
    mocks.electronicBilling.createPDF.mockResolvedValue({
      file: "https://example.com/invoice.pdf",
    });

    const response = await CreatePDFTool.execute(pdfParams);

    expect(parseContent(response)).toMatchObject({
      success: true,
      file: "https://example.com/invoice.pdf",
    });
    expect(mocks.generateQRCode).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: "2026-06-14", codAut: 12345678901234 }),
    );
    expect(mocks.electronicBilling.createPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        file_name: "Factura_C_00001_00000123",
        html: expect.stringContaining("data:image/png;base64,qr"),
      }),
    );
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
