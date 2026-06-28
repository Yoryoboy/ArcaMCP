import { describe, expect, it } from "vitest";

import { getMocks, parseContent, pdfParams } from "./ToolExecution.test.helpers.js";
import { CreatePDFTool } from "../CreatePDFTool/CreatePDFTool.js";

const mocks = getMocks();

describe("CreatePDFTool", () => {
  it("populates all template placeholders with correct user-visible values and produces the PDF", async () => {
    // Representative template exercising most real bill.html placeholders.
    // This proves the full template-population contract: placeholder→value,
    // AR formatting, padding, QR injection, item rows, and no leftover {{…}}.
    const template = [
      '<!DOCTYPE html><html><body>',
      '<div class="bill-type">{{CbteLetra}}</div>',
      '<p>{{NOMBRE_EMISOR}}</p>',
      '<p>{{DIRECCION_EMISOR}}</p>',
      '<p>{{CondicionIVAEmisor}}</p>',
      '<p>Punto de Venta: {{PtoVta}} Comp. Nro: {{CbteNro}}</p>',
      '<p>Fecha de Emisión: {{CbteFch}} CUIT: {{CUIT_EMISOR}}</p>',
      '<p>Ingresos Brutos: {{INGRESOS_BRUTOS}}</p>',
      '<p>{{FECHA_INICIO_ACTIVIDADES}}</p>',
      '<p>{{FchServDesde}} | {{FchServHasta}} | {{FchVtoPago}}</p>',
      '<p>CUIL/CUIT: {{DocNro}}</p>',
      '<p>{{NOMBRE_RECEPTOR}}</p>',
      '<p>{{CondicionIVAReceptor}}</p>',
      '<p>{{DIRECCION_RECEPTOR}}</p>',
      '<p>{{CONDICION_PAGO}}</p>',
      '<p>Subtotal $ {{SUBTOTAL}} Otros $ {{IMPORTE_OTROS_TRIBUTOS}} Total $ {{IMPORTE_TOTAL}}</p>',
      '<p>CAE N°: {{CAE_NUMBER}} Vto: {{CAE_EXPIRY_DATE}}</p>',
      '<img src="{{QR_CODE_DATA}}">',
      '{{INVOICE_ITEMS}}',
      '</body></html>',
    ].join("");

    mocks.findTemplate.mockReturnValue(template);
    mocks.generateQRCode.mockResolvedValue("data:image/png;base64,qr");
    mocks.electronicBilling.createPDF.mockResolvedValue({
      file: "https://example.com/invoice.pdf",
    });

    const response = await CreatePDFTool.execute(pdfParams);

    // Success envelope
    expect(parseContent(response)).toMatchObject({
      success: true,
      file: "https://example.com/invoice.pdf",
    });

    const htmlSent = mocks.electronicBilling.createPDF.mock.calls[0][0].html;

    // -- user-visible data was rendered --
    expect(htmlSent).toContain("C");                     // CbteLetra
    expect(htmlSent).toContain("Owner Name");            // NOMBRE_EMISOR
    expect(htmlSent).toContain("Owner Address");         // DIRECCION_EMISOR
    expect(htmlSent).toContain("Monotributo");           // CondicionIVAEmisor
    expect(htmlSent).toContain("00001");                 // PtoVta padded
    expect(htmlSent).toContain("00000123");              // CbteNro padded
    expect(htmlSent).toContain("14/06/2026");            // CbteFch DD/MM/YYYY
    expect(htmlSent).toContain("20123456789");           // CUIT_EMISOR
    expect(htmlSent).toContain("20304050607");           // DocNro
    expect(htmlSent).toContain("Recipient Name");        // NOMBRE_RECEPTOR
    expect(htmlSent).toContain("Consumidor Final");      // CondicionIVAReceptor
    expect(htmlSent).toContain("Contado");               // CONDICION_PAGO default
    expect(htmlSent).toContain("100,00");                // SUBTOTAL es-AR
    expect(htmlSent).toContain("0,00");                  // IMPORTE_OTROS_TRIBUTOS default
    expect(htmlSent).toContain("12345678901234");        // CAE_NUMBER
    expect(htmlSent).toContain("30/06/2026");            // CAE_EXPIRY_DATE DD/MM/YYYY
    expect(htmlSent).toContain("data:image/png;base64,qr"); // QR_CODE_DATA
    expect(htmlSent).toContain("Consulting");            // INVOICE_ITEMS

    // -- NO unreplaced {{…}} placeholder leaked through --
    expect(htmlSent).not.toMatch(/\{\{.+?\}\}/);

    // QR payload is correct
    expect(mocks.generateQRCode).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: "2026-06-14", codAut: 12345678901234 }),
    );

    // File name follows convention
    expect(mocks.electronicBilling.createPDF).toHaveBeenCalledWith(
      expect.objectContaining({
        file_name: "Factura_C_00001_00000123",
      }),
    );
  });

  it("does NOT call AFIP createPDF when QR generation fails", async () => {
    mocks.findTemplate.mockReturnValue("{{QR_CODE_DATA}}");
    mocks.generateQRCode.mockRejectedValue(new Error("QR generation failed"));

    const response = await CreatePDFTool.execute(pdfParams);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({ success: false });
    expect(mocks.electronicBilling.createPDF).not.toHaveBeenCalled();
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
