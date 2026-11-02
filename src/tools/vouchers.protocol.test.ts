import { describe, expect, it } from "vitest";
import { connectClient, getMocks, textOf } from "./protocol.test.helpers.js";
import { voucherCore, voucherParams } from "./CreateVoucherTool/ToolExecution.test.helpers.js";

const mocks = getMocks();

const outputSchemaOf = async (name: string) => {
  const connected = await connectClient();
  const tool = (await connected.listTools()).tools.find((candidate) => candidate.name === name);
  return { connected, outputSchema: tool?.outputSchema };
};

describe("voucher tools structured output", () => {
  describe("get_last_voucher", () => {
    const args = { PtoVta: 1, CbteTipo: 11 };

    it("declares CbteNro in its output schema", async () => {
      const { outputSchema } = await outputSchemaOf("get_last_voucher");

      expect(outputSchema?.properties).toHaveProperty("CbteNro");
      expect(outputSchema?.required ?? []).toEqual([]);
    });

    it("returns CbteNro for a numeric result", async () => {
      mocks.electronicBilling.getLastVoucher.mockResolvedValue(123);
      const { connected } = await outputSchemaOf("get_last_voucher");

      const result = await connected.callTool({ name: "get_last_voucher", arguments: args });

      expect(mocks.electronicBilling.getLastVoucher).toHaveBeenCalledWith(1, 11);
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ CbteNro: 123 });
      expect(textOf(result)).toBe(123);
    });

    it("returns CbteNro for an object result", async () => {
      mocks.electronicBilling.getLastVoucher.mockResolvedValue({
        CbteNro: 123,
        PtoVta: 1,
        CbteTipo: 11,
      });
      const { connected } = await outputSchemaOf("get_last_voucher");

      const result = await connected.callTool({ name: "get_last_voucher", arguments: args });

      expect(mocks.electronicBilling.getLastVoucher).toHaveBeenCalledOnce();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ CbteNro: 123 });
      expect(textOf(result)).toBe(123);
    });

    it("reports CbteNro 0 for the first voucher while keeping the text unchanged", async () => {
      const afipResult = { CbteNro: 0, PtoVta: 1, CbteTipo: 11 };
      mocks.electronicBilling.getLastVoucher.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("get_last_voucher");

      const result = await connected.callTool({ name: "get_last_voucher", arguments: args });

      expect(mocks.electronicBilling.getLastVoucher).toHaveBeenCalledOnce();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ CbteNro: 0 });
      expect(textOf(result)).toEqual(afipResult);
    });

    it("falls back to the AFIP object when it has no CbteNro", async () => {
      const afipResult = { PtoVta: 1, CbteTipo: 11 };
      mocks.electronicBilling.getLastVoucher.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("get_last_voucher");

      const result = await connected.callTool({ name: "get_last_voucher", arguments: args });

      expect(mocks.electronicBilling.getLastVoucher).toHaveBeenCalledOnce();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });
  });

  describe("create_voucher", () => {
    it("declares the CAE fields in its output schema", async () => {
      const { outputSchema } = await outputSchemaOf("create_voucher");

      expect(outputSchema?.properties).toHaveProperty("CAE");
      expect(outputSchema?.properties).toHaveProperty("CAEFchVto");
      expect(outputSchema?.required ?? []).toEqual([]);
    });

    it("returns CAE and CAEFchVto by default", async () => {
      const afipResult = { CAE: "75123456789012", CAEFchVto: "20260624" };
      mocks.electronicBilling.createVoucher.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("create_voucher");

      const result = await connected.callTool({ name: "create_voucher", arguments: voucherParams });

      expect(mocks.electronicBilling.createVoucher).toHaveBeenCalledWith(
        expect.objectContaining({ PtoVta: 1, CbteTipo: 11 }),
        false,
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });

    it("returns the whole FECAESolicitar response with fullResponse", async () => {
      const afipResult = {
        FeCabResp: { Cuit: 20123456789, PtoVta: 1, CbteTipo: 11, Resultado: "A" },
        FeDetResp: {
          FECAEDetResponse: [
            { CbteDesde: 10, CbteHasta: 10, Resultado: "A", CAE: "75123456789012" },
          ],
        },
      };
      mocks.electronicBilling.createVoucher.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("create_voucher");

      const result = await connected.callTool({
        name: "create_voucher",
        arguments: { ...voucherParams, fullResponse: true },
      });

      expect(mocks.electronicBilling.createVoucher).toHaveBeenCalledWith(expect.any(Object), true);
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });
  });

  describe("create_next_voucher", () => {
    it("declares CAE, CAEFchVto and voucherNumber in its output schema", async () => {
      const { outputSchema } = await outputSchemaOf("create_next_voucher");

      expect(outputSchema?.properties).toHaveProperty("CAE");
      expect(outputSchema?.properties).toHaveProperty("CAEFchVto");
      expect(outputSchema?.properties).toHaveProperty("voucherNumber");
      expect(outputSchema?.required ?? []).toEqual([]);
    });

    it("returns CAE, CAEFchVto and the assigned voucher number", async () => {
      const afipResult = { CAE: "75123456789012", CAEFchVto: "20260624", voucherNumber: 124 };
      mocks.electronicBilling.createNextVoucher.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("create_next_voucher");

      const result = await connected.callTool({
        name: "create_next_voucher",
        arguments: voucherCore,
      });

      expect(mocks.electronicBilling.createNextVoucher).toHaveBeenCalledOnce();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });
  });

  describe("get_voucher_info", () => {
    const args = { CbteNro: 123, PtoVta: 1, CbteTipo: 11 };

    it("declares the voucher fields and message in its output schema", async () => {
      const { outputSchema } = await outputSchemaOf("get_voucher_info");

      for (const field of ["CbteDesde", "ImpTotal", "CodAutorizacion", "Resultado", "message"]) {
        expect(outputSchema?.properties).toHaveProperty(field);
      }
      expect(outputSchema?.required ?? []).toEqual([]);
    });

    it("returns the voucher found in AFIP", async () => {
      const afipResult = {
        Concepto: 1,
        DocTipo: 99,
        DocNro: 0,
        CbteDesde: 123,
        CbteHasta: 123,
        CbteFch: "20260614",
        ImpTotal: 121,
        MonId: "PES",
        MonCotiz: 1,
        Resultado: "A",
        CodAutorizacion: "75123456789012",
        EmisionTipo: "CAE",
        FchVto: "20260624",
        FchProceso: "20260614120000",
        PtoVta: 1,
        CbteTipo: 11,
      };
      mocks.electronicBilling.getVoucherInfo.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("get_voucher_info");

      const result = await connected.callTool({ name: "get_voucher_info", arguments: args });

      expect(mocks.electronicBilling.getVoucherInfo).toHaveBeenCalledWith(123, 1, 11);
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });

    it("returns a message, not an error, when the voucher does not exist", async () => {
      mocks.electronicBilling.getVoucherInfo.mockResolvedValue(null);
      const { connected } = await outputSchemaOf("get_voucher_info");

      const result = await connected.callTool({ name: "get_voucher_info", arguments: args });

      expect(mocks.electronicBilling.getVoucherInfo).toHaveBeenCalledOnce();
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual({ message: "El comprobante no existe" });
      expect(textOf(result)).toEqual({ message: "El comprobante no existe" });
    });
  });

  describe("get_exchange_rate", () => {
    const args = { MonId: "DOL", FchCotiz: "20260614" };

    it("declares the exchange rate fields in its output schema", async () => {
      const { outputSchema } = await outputSchemaOf("get_exchange_rate");

      expect(outputSchema?.properties).toHaveProperty("ResultGet");
      expect(outputSchema?.required ?? []).toEqual([]);
    });

    it("returns the exchange rate reported by AFIP", async () => {
      const afipResult = { ResultGet: { MonId: "DOL", MonCotiz: 1200.5, FchCotiz: "20260614" } };
      mocks.electronicBilling.executeRequest.mockResolvedValue(afipResult);
      const { connected } = await outputSchemaOf("get_exchange_rate");

      const result = await connected.callTool({ name: "get_exchange_rate", arguments: args });

      expect(mocks.electronicBilling.executeRequest).toHaveBeenCalledWith(
        "FEParamGetCotizacion",
        args,
      );
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(afipResult);
      expect(textOf(result)).toEqual(afipResult);
    });
  });
});
