import { describe, expect, it } from "vitest";

import {
  getMocks,
  parseContent,
  voucherCore,
  voucherParams,
} from "./ToolExecution.test.helpers.js";
import { CreateNextVoucherTool } from "../CreateNextVoucherTool/CreateNextVoucherTool.js";
import { CreateVoucherTool } from "./CreateVoucherTool.js";

const mocks = getMocks();

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

  it("removes empty arrays before calling AFIP for create_voucher", async () => {
    mocks.electronicBilling.createVoucher.mockResolvedValue({ ok: true });

    await CreateVoucherTool.execute({
      ...voucherParams,
      Iva: [],
      Tributos: [],
      CbtesAsoc: [],
      Opcionales: [],
    });

    const cleanedParams = expect.not.objectContaining({
      Iva: expect.anything(),
      Tributos: expect.anything(),
      CbtesAsoc: expect.anything(),
      Opcionales: expect.anything(),
    });

    expect(mocks.electronicBilling.createVoucher).toHaveBeenCalledWith(cleanedParams, false);
  });

  it("adds processed AFIP instructions when create_voucher fails", async () => {
    const afipError = { code: 10049, message: "(10049) Missing service dates" };
    mocks.electronicBilling.createVoucher.mockRejectedValue(afipError);

    const response = await CreateVoucherTool.execute({ ...voucherParams, fullResponse: false });

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      details: afipError,
      instructions: expect.stringContaining("FchServDesde"),
    });
  });

  it("adds processed AFIP instructions when create_next_voucher fails", async () => {
    const afipError = { code: 10049, message: "(10049) Missing service dates" };
    mocks.electronicBilling.createNextVoucher.mockRejectedValue(afipError);

    const response = await CreateNextVoucherTool.execute(voucherCore);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      details: afipError,
      instructions: expect.stringContaining("FchServDesde"),
    });
  });

  it("rejects a semantically invalid voucher locally before calling AFIP", async () => {
    // Factura C (CbteTipo 11) con IVA discriminado: inválido semánticamente.
    const response = await CreateVoucherTool.execute({
      ...voucherParams,
      ImpNeto: 100,
      ImpIVA: 21,
      ImpTotal: 121,
    });

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      success: false,
      kind: "validation",
    });
    expect(parseContent(response).error).toContain("ImpIVA");
    expect(mocks.electronicBilling.createVoucher).not.toHaveBeenCalled();
  });

  it("rejects a services voucher missing service dates before calling AFIP", async () => {
    const response = await CreateNextVoucherTool.execute({
      ...voucherCore,
      Concepto: 2,
    });

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      success: false,
      kind: "validation",
    });
    expect(parseContent(response).error).toContain("FchServDesde");
    expect(mocks.electronicBilling.createNextVoucher).not.toHaveBeenCalled();
  });
});
