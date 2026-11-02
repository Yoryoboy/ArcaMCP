import { describe, expect, it } from "vitest";
import { connectClient, getMocks, textOf } from "./protocol.test.helpers.js";

const mocks = getMocks();

// Shapes AFIP really returns: a valid response must never become an output validation error.
describe("structured output with realistic AFIP payloads", () => {
  it("accepts empty cells in Mis Comprobantes rows", async () => {
    const details = {
      id: "a1",
      status: "complete",
      data: [{ "Fecha de Emisión": "2026-06-14", "Tipo Cambio": null, "Imp. Total": 100 }],
    };
    mocks.afip.GetAutomationDetails.mockResolvedValue(details);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_automation_details", arguments: { id: "a1" } });

    expect(mocks.afip.GetAutomationDetails).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(details);
  });

  it("accepts a taxpayer with a single domicilio object", async () => {
    const taxpayer = {
      idPersona: 20123456789,
      razonSocial: "ACME SA",
      domicilio: { tipoDomicilio: "FISCAL", direccion: "Calle 1" },
    };
    mocks.afip.RegisterScopeThirteen.getTaxpayerDetails.mockResolvedValue(taxpayer);

    const result = await (
      await connectClient()
    ).callTool({ name: "get_taxpayer_details", arguments: { taxId: 20123456789 } });

    expect(mocks.afip.RegisterScopeThirteen.getTaxpayerDetails).toHaveBeenCalledOnce();
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(taxpayer);
  });

  it("documents the ResultGet envelope that FEParamGetCotizacion returns", async () => {
    const rate = { ResultGet: { MonId: "DOL", MonCotiz: 1200.5, FchCotiz: "20260614" } };
    mocks.electronicBilling.executeRequest.mockResolvedValue(rate);
    const connected = await connectClient();

    const tool = (await connected.listTools()).tools.find((t) => t.name === "get_exchange_rate");
    const result = await connected.callTool({
      name: "get_exchange_rate",
      arguments: { MonId: "DOL", FchCotiz: "20260614" },
    });

    expect(tool?.outputSchema?.properties).toHaveProperty("ResultGet");
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(rate);
    expect(textOf(result)).toEqual(rate);
  });

  it("keeps a textual CbteNro as a non-error result", async () => {
    mocks.electronicBilling.getLastVoucher.mockResolvedValue({ CbteNro: "5" });

    const result = await (
      await connectClient()
    ).callTool({ name: "get_last_voucher", arguments: { PtoVta: 1, CbteTipo: 11 } });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toBe("5");
  });
});
