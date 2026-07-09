import { describe, expect, it, vi } from "vitest";

import {
  cleanEmptyVoucherArrays,
  executeVoucherTool,
} from "./voucherToolExecution.helpers.js";

describe("cleanEmptyVoucherArrays", () => {
  it("removes empty voucher arrays", () => {
    expect(
      cleanEmptyVoucherArrays({
        PtoVta: 1,
        Iva: [],
        Tributos: [],
        CbtesAsoc: [],
        Opcionales: [],
      }),
    ).toEqual({ PtoVta: 1 });
  });

  it("preserves populated voucher arrays and unrelated fields", () => {
    const iva = [{ Id: 5, BaseImp: 100, Importe: 21 }];
    const cbtesAsoc = [{ Tipo: 1, PtoVta: 1, Nro: 2 }];
    const opcionales = [{ Id: "x", Valor: "y" }];

    expect(
      cleanEmptyVoucherArrays({
        PtoVta: 1,
        fullResponse: true,
        Iva: iva,
        Tributos: [],
        CbtesAsoc: cbtesAsoc,
        Opcionales: opcionales,
      }),
    ).toEqual({
      PtoVta: 1,
      fullResponse: true,
      Iva: iva,
      CbtesAsoc: cbtesAsoc,
      Opcionales: opcionales,
    });
  });
});

describe("executeVoucherTool", () => {
  it("parses, cleans and serializes successful voucher responses", async () => {
    const parse = vi.fn().mockReturnValue({
      PtoVta: 1,
      fullResponse: true,
      Iva: [],
      Tributos: [],
      CbtesAsoc: [],
      Opcionales: [],
    });
    const invoke = vi.fn().mockResolvedValue({ CAE: "manual" });

    const response = await executeVoucherTool({
      params: { PtoVta: 1 },
      schema: { parse },
      invoke,
    });

    expect(parse).toHaveBeenCalledWith({ PtoVta: 1 });
    expect(invoke).toHaveBeenCalledWith({
      validatedParams: {
        PtoVta: 1,
        fullResponse: true,
        Iva: [],
        Tributos: [],
        CbtesAsoc: [],
        Opcionales: [],
      },
      cleanedParams: {
        PtoVta: 1,
        fullResponse: true,
      },
    });
    expect(response).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ CAE: "manual" }, null, 2),
        },
      ],
    });
  });

  it("formats voucher errors through the shared AFIP error processor", async () => {
    const parse = vi.fn().mockReturnValue({
      PtoVta: 1,
      Iva: [],
      Tributos: [],
      CbtesAsoc: [],
      Opcionales: [],
    });
    const afipError = {
      code: 10049,
      message: "(10049) Missing service dates",
    };

    const response = await executeVoucherTool({
      params: { PtoVta: 1 },
      schema: { parse },
      invoke: vi.fn().mockRejectedValue(afipError),
    });

    expect(response.isError).toBe(true);
    expect(JSON.parse(response.content[0].text)).toMatchObject({
      details: afipError,
      instructions: expect.stringContaining("FchServDesde"),
    });
  });
});
