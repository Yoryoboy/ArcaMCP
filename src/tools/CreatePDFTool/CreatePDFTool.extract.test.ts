import { describe, expect, it } from "vitest";
import type { CreatePDFResolvedInput } from "./CreatePDFTool.schemas.js";

// These imports will fail until we create the functions (TDD RED step).
import {
  buildReplacementMap,
  applyReplacements,
  buildQrPayload,
  buildFileName,
  renderIngresosBrutos,
} from "./CreatePDFTool.helpers.js";

// --------------- Test fixtures ---------------

const baseInput: CreatePDFResolvedInput = {
  CbteTipo: 11,
  CbteLetra: "C",
  Concepto: 1,
  NOMBRE_EMISOR: "Owner Name",
  CUIT_EMISOR: "20123456789",
  DIRECCION_EMISOR: "Owner Address",
  CondicionIVAEmisor: "Monotributo",
  INGRESOS_BRUTOS: { condicion: "Local", numeroInscripcion: "IIBB-123" },
  FECHA_INICIO_ACTIVIDADES: "2022-01-31",
  PtoVta: 1,
  CbteNro: 123,
  CbteFch: "20260614",
  MonId: "PES",
  MonCotiz: 1,
  DocNro: "20304050607",
  NOMBRE_RECEPTOR: "Recipient Name",
  CondicionIVAReceptor: "Consumidor Final",
  CONDICION_PAGO: "Contado",
  SUBTOTAL: 100,
  IMPORTE_OTROS_TRIBUTOS: 0,
  IMPORTE_TOTAL: 100,
  CAE_NUMBER: "12345678901234",
  CAE_EXPIRY_DATE: "20260630",
  TipoCodAut: "E",
  INVOICE_ITEMS: [{ descripcion: "Consulting", cantidad: 1, precioUnitario: 100, importe: 100 }],
};

const qrDataUrl = "data:image/png;base64,fakeQr";

// --------------- buildReplacementMap ---------------

describe("buildReplacementMap", () => {
  it("maps CbteLetra placeholder", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{CbteLetra}}"]).toBe("C");
  });

  it("maps NOMBRE_EMISOR placeholder", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{NOMBRE_EMISOR}}"]).toBe("Owner Name");
  });

  it("maps PtoVta padded to 5 digits", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{PtoVta}}"]).toBe("00001");
  });

  it("maps CbteNro padded to 8 digits", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{CbteNro}}"]).toBe("00000123");
  });

  it("formats CbteFch to DD/MM/YYYY", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{CbteFch}}"]).toBe("14/06/2026");
  });

  it("formats FECHA_INICIO_ACTIVIDADES to DD/MM/YYYY", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{FECHA_INICIO_ACTIVIDADES}}"]).toBe("31/01/2022");
  });

  it("formats SUBTOTAL and IMPORTE_TOTAL with es-AR locale", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{SUBTOTAL}}"]).toBe("100,00");
    expect(map["{{IMPORTE_TOTAL}}"]).toBe("100,00");
  });

  it("injects QR_CODE_DATA", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{QR_CODE_DATA}}"]).toBe(qrDataUrl);
  });

  it("injects INVOICE_ITEMS via renderItems", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{INVOICE_ITEMS}}"]).toContain("Consulting");
    expect(map["{{INVOICE_ITEMS}}"]).toContain("<tr>");
  });

  it("handles optional fields with defaults (empty)", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{INGRESOS_BRUTOS}}"]).toBe("Local - Inscripción IIBB: IIBB-123");
  });

  it("handles optional date fields", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{FchServDesde}}"]).toBe("");
  });

  it("includes CAE_NUMBER as string", () => {
    const map = buildReplacementMap(baseInput, qrDataUrl);
    expect(map["{{CAE_NUMBER}}"]).toBe("12345678901234");
  });
});

describe("renderIngresosBrutos", () => {
  it.each([
    [{ condicion: "Local" as const, numeroInscripcion: "123" }, "Local - Inscripción IIBB: 123"],
    [
      { condicion: "Convenio Multilateral" as const, numeroInscripcion: "456" },
      "Convenio Multilateral - Inscripción IIBB: 456",
    ],
    [{ condicion: "Exento" as const }, "Exento"],
    [{ condicion: "No contribuyente" as const }, "No contribuyente"],
  ])("renders the exact fiscal label", (value, expected) => {
    expect(renderIngresosBrutos(value)).toBe(expected);
  });
});

// --------------- applyReplacements ---------------

describe("applyReplacements", () => {
  it("replaces all placeholders in template", () => {
    const html = "Hola {{CbteLetra}}, soy {{NOMBRE_EMISOR}}";
    const repl = { "{{CbteLetra}}": "C", "{{NOMBRE_EMISOR}}": "Owner" };
    expect(applyReplacements(html, repl)).toBe("Hola C, soy Owner");
  });

  it("leaves unknown placeholders untouched (only iterates known keys)", () => {
    const html = "{{MISSING}} content";
    const repl: Record<string, string> = {};
    expect(applyReplacements(html, repl)).toBe("{{MISSING}} content");
  });

  it("handles multiple occurrences of same placeholder", () => {
    const html = "{{X}} {{X}}";
    expect(applyReplacements(html, { "{{X}}": "A" })).toBe("A A");
  });
});

// --------------- buildQrPayload ---------------

describe("buildQrPayload", () => {
  it("builds QR payload with all required fields", () => {
    const payload = buildQrPayload(baseInput);
    expect(payload).toMatchObject({
      ver: 1,
      fecha: "2026-06-14",
      cuit: 20123456789,
      ptoVta: 1,
      tipoCmp: 11,
      nroCmp: 123,
      importe: 100,
      moneda: "PES",
      ctz: 1,
      tipoCodAut: "E",
      codAut: 12345678901234,
    });
  });

  it("includes DocNro fields when present", () => {
    const payload = buildQrPayload(baseInput);
    expect(payload).toHaveProperty("tipoDocRec", 80);
    expect(payload).toHaveProperty("nroDocRec", 20304050607);
  });

  it("omits DocNro fields when DocNro is empty", () => {
    const input = { ...baseInput, DocNro: "" };
    const payload = buildQrPayload(input);
    expect(payload).not.toHaveProperty("tipoDocRec");
    expect(payload).not.toHaveProperty("nroDocRec");
  });

  it("converts a valid 11-digit DocNro to numeric nroDocRec", () => {
    const input = { ...baseInput, DocNro: "99999999999" };
    const payload = buildQrPayload(input);
    expect(payload.nroDocRec).toBe(99999999999);
    expect(payload).toHaveProperty("tipoDocRec", 80);
  });

  it("date format is YYYY-MM-DD (ISO)", () => {
    const payload = buildQrPayload(baseInput);
    expect(payload.fecha).toBe("2026-06-14");
  });
});

// --------------- buildFileName ---------------

describe("buildFileName", () => {
  it("builds file name with padded PtoVta and CbteNro", () => {
    expect(buildFileName(baseInput)).toBe("Factura_C_00001_00000123");
  });

  it("handles different letters", () => {
    const inputA = { ...baseInput, CbteLetra: "A" as const };
    expect(buildFileName(inputA)).toBe("Factura_A_00001_00000123");
  });
});
