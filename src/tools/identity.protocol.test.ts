import { connectClient, getMocks, textOf } from "./protocol.test.helpers.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, vi } from "vitest";
import { pdfParams } from "./CreateVoucherTool/ToolExecution.test.helpers.js";
import { resetOwnerProfileCache } from "../services/afip/ownerTaxpayerProfile.js";

const mocks = getMocks();

const outputProperties = async (name: string) => {
  const { tools } = await (await connectClient()).listTools();
  const tool = tools.find((candidate) => candidate.name === name);
  return tool?.outputSchema?.properties ?? {};
};

const misComprobantesArgs = { t: "E", fechaEmision: "01/06/2026 - 30/06/2026" };

describe("get_taxpayer_details", () => {
  const taxpayer = {
    idPersona: 20123456789,
    nombre: "Owner",
    apellido: "Name",
    tipoPersona: "FISICA",
    domicilio: [{ tipoDomicilio: "FISCAL", direccion: "Owner Address" }],
    campoNuevoDeAfip: "se acepta",
  };

  it("declares its known fields as an output schema", async () => {
    expect(await outputProperties("get_taxpayer_details")).toEqual(
      expect.objectContaining({
        nombre: expect.anything(),
        domicilio: expect.anything(),
        message: expect.anything(),
      }),
    );
  });

  it("returns the A13 payload as structured content", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxpayerDetails.mockResolvedValue(taxpayer);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_taxpayer_details", arguments: { taxId: 20123456789 } });

    expect(mocks.afip.RegisterScopeThirteen.getTaxpayerDetails).toHaveBeenCalledWith(20123456789);
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(taxpayer);
    expect(textOf(result)).toEqual(taxpayer);
  });

  it("passes a null A13 result through as a value", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxpayerDetails.mockResolvedValue(null);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_taxpayer_details", arguments: { taxId: 20123456789 } });

    expect(mocks.afip.RegisterScopeThirteen.getTaxpayerDetails).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ value: null });
    expect(textOf(result)).toBeNull();
  });

  it("returns the testing-environment notice without calling AFIP", async () => {
    mocks.config.AFIP_PRODUCTION = false;

    const result = await (
      await connectClient()
    ).callTool({ name: "get_taxpayer_details", arguments: { taxId: 20123456789 } });

    expect(mocks.afip.RegisterScopeThirteen.getTaxpayerDetails).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      message: expect.stringContaining("ambiente de testing"),
    });
    expect(textOf(result)).toEqual(result.structuredContent);
  });
});

describe("get_cuit_from_dni", () => {
  const call = async () =>
    (await connectClient()).callTool({
      name: "get_cuit_from_dni",
      arguments: { nationalId: 12345678 },
    });

  it("declares the cuit and message fields", async () => {
    expect(await outputProperties("get_cuit_from_dni")).toEqual(
      expect.objectContaining({ cuit: expect.anything(), message: expect.anything() }),
    );
  });

  it("returns a numeric CUIT as a string", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument.mockResolvedValue(20123456786);

    const result = await call();

    expect(mocks.afip.RegisterScopeThirteen.getTaxIDByDocument).toHaveBeenCalledWith(12345678);
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ cuit: "20123456786" });
    expect(textOf(result)).toBe(20123456786);
  });

  it("keeps a string CUIT and an empty string as they are", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument
      .mockResolvedValueOnce("20123456786")
      .mockResolvedValueOnce("");

    const filled = await call();
    const empty = await call();

    expect(filled.structuredContent).toEqual({ cuit: "20123456786" });
    expect(textOf(filled)).toBe("20123456786");
    expect(empty.isError).toBeUndefined();
    expect(empty.structuredContent).toEqual({ cuit: "" });
    expect(textOf(empty)).toBe("");
  });

  it("answers a not-found DNI with a message", async () => {
    mocks.afip.RegisterScopeThirteen.getTaxIDByDocument.mockResolvedValue(null);

    const result = await call();

    expect(mocks.afip.RegisterScopeThirteen.getTaxIDByDocument).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      message: "No se encontró CUIT para el DNI proporcionado",
    });
    expect(textOf(result)).toEqual({ message: "No se encontró CUIT para el DNI proporcionado" });
  });

  it("returns the testing-environment notice without calling AFIP", async () => {
    mocks.config.AFIP_PRODUCTION = false;

    const result = await call();

    expect(mocks.afip.RegisterScopeThirteen.getTaxIDByDocument).not.toHaveBeenCalled();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      message: expect.stringContaining("ambiente de testing"),
    });
  });
});

describe("create_pdf", () => {
  it("declares the response fields", async () => {
    expect(await outputProperties("create_pdf")).toEqual(
      expect.objectContaining({
        success: expect.anything(),
        phase: expect.anything(),
        message: expect.anything(),
        file: expect.anything(),
        expiresInHours: expect.anything(),
      }),
    );
  });

  it("returns the PDF link as structured content", async () => {
    resetOwnerProfileCache();
    mocks.findTemplate.mockReturnValue("<html>{{NOMBRE_RECEPTOR}}</html>");
    mocks.generateQRCode.mockResolvedValue("data:image/png;base64,qr");
    mocks.electronicBilling.createPDF.mockResolvedValue({ file: "https://example.com/a.pdf" });
    const expected = {
      success: true,
      phase: "pdf_created",
      message: "PDF generado correctamente. El enlace expira en 24 horas.",
      file: "https://example.com/a.pdf",
      expiresInHours: 24,
    };

    const result = await (
      await connectClient()
    ).callTool({ name: "create_pdf", arguments: pdfParams });

    expect(mocks.electronicBilling.createPDF).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(expected);
    expect(textOf(result)).toEqual(expected);
  });
});

describe("mis_comprobantes", () => {
  it("declares the automation start fields", async () => {
    expect(await outputProperties("mis_comprobantes")).toEqual(
      expect.objectContaining({ id: expect.anything(), status: expect.anything() }),
    );
  });

  it("returns the started automation as structured content", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-1", status: "in_process" });

    const result = await (
      await connectClient()
    ).callTool({ name: "mis_comprobantes", arguments: misComprobantesArgs });

    expect(mocks.afip.CreateAutomation).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ id: "auto-1", status: "in_process" });
    expect(textOf(result, 1)).toEqual({ id: "auto-1", status: "in_process" });
    expect((result.content as Array<{ text: string }>)[0].text).toBe(
      "Automatización iniciada. ID: auto-1. Status: in_process. Darle al usuario el ID, para que luego pueda consultarlo.",
    );
  });
});

describe("get_automation_details", () => {
  const completed = {
    id: "auto-1",
    status: "complete",
    data: [{ "Tipo de Comprobante": "11 - Factura C", "Imp. Total": "121,00", extra: "ok" }],
  };

  it("declares the automation fields", async () => {
    expect(await outputProperties("get_automation_details")).toEqual(
      expect.objectContaining({
        id: expect.anything(),
        status: expect.anything(),
        data: expect.anything(),
      }),
    );
  });

  it("returns the finished automation rows as structured content", async () => {
    mocks.afip.GetAutomationDetails.mockResolvedValue(completed);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_automation_details", arguments: { id: "auto-1" } });

    expect(mocks.afip.GetAutomationDetails).toHaveBeenCalledWith("auto-1", false);
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(completed);
    expect(textOf(result)).toEqual(completed);
  });

  it("returns an automation still in process without data", async () => {
    mocks.afip.GetAutomationDetails.mockResolvedValue({ id: "auto-1", status: "in_process" });

    const result = await (
      await connectClient()
    ).callTool({ name: "get_automation_details", arguments: { id: "auto-1" } });

    expect(mocks.afip.GetAutomationDetails).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ id: "auto-1", status: "in_process" });
  });

  it("passes a null result through as a value", async () => {
    mocks.afip.GetAutomationDetails.mockResolvedValue(null);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_automation_details", arguments: { id: "auto-1" } });

    expect(mocks.afip.GetAutomationDetails).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ value: null });
  });
});

describe("get_certificate_status", () => {
  it("declares the certificate fields", async () => {
    expect(await outputProperties("get_certificate_status")).toEqual(
      expect.objectContaining({
        environment: expect.anything(),
        validFrom: expect.anything(),
        validUntil: expect.anything(),
        daysRemaining: expect.anything(),
        status: expect.anything(),
        warningThresholdDays: expect.anything(),
      }),
    );
  });

  it("returns the certificate status as structured content", async () => {
    // The tool reads the status from the AFIP client module, which the shared
    // mocks do not provide, so it is replaced for a freshly loaded server.
    const expected = {
      environment: "production" as const,
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2028-01-01T00:00:00.000Z",
      daysRemaining: 400,
      status: "valid" as const,
      warningThresholdDays: 90,
    };
    const getStatus = vi.fn(() => expected);
    vi.doMock("../services/afip/client.js", () => ({
      default: mocks.afip,
      getDefaultCertificateStatus: () => ({ getStatus }),
    }));
    vi.resetModules();
    const { createServer } = await import("../server.js");
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await createServer({ getStatus }).connect(serverTransport);
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({ name: "get_certificate_status", arguments: {} });

      expect(getStatus).toHaveBeenCalled();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(expected);
      expect(textOf(result)).toEqual(expected);
    } finally {
      await client.close();
      vi.doUnmock("../services/afip/client.js");
    }
  });
});
