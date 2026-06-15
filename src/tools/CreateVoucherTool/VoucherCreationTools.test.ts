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

  it.each([
    [
      CreateVoucherTool,
      { ...voucherParams, Iva: [], Tributos: [], CbtesAsoc: [], Opcionales: [] },
      mocks.electronicBilling.createVoucher,
      false,
    ],
    [
      CreateNextVoucherTool,
      { ...voucherCore, Iva: [], Tributos: [], CbtesAsoc: [], Opcionales: [] },
      mocks.electronicBilling.createNextVoucher,
      undefined,
    ],
  ])(
    "removes empty arrays before calling AFIP for %p",
    async (tool, params, mockFn, fullResponse) => {
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
    },
  );

  it.each([
    [CreateVoucherTool, { ...voucherParams, fullResponse: false }],
    [CreateNextVoucherTool, voucherCore],
  ])("adds processed AFIP instructions when %p fails", async (tool, params) => {
    const afipError = { code: 10049, message: "(10049) Missing service dates" };
    const mockFn =
      tool === CreateVoucherTool
        ? mocks.electronicBilling.createVoucher
        : mocks.electronicBilling.createNextVoucher;
    mockFn.mockRejectedValue(afipError);

    const response = await tool.execute(params);

    expect(response.isError).toBe(true);
    expect(parseContent(response)).toMatchObject({
      details: afipError,
      instructions: expect.stringContaining("FchServDesde"),
    });
  });
});
