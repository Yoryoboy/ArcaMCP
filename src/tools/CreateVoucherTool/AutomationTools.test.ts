import { describe, expect, it } from "vitest";

import { getMocks, parseContent } from "./ToolExecution.test.helpers.js";
import { GetAutomationDetailsTool } from "../GetAutomationDetailsTool/GetAutomationDetailsTool.js";
import { MisComprobantesTool } from "../MisComprobantesTool/MisComprobantesTool.js";

const mocks = getMocks();

describe("automation tools", () => {
  it("starts and inspects automation flows", async () => {
    mocks.afip.CreateAutomation.mockResolvedValue({ id: "auto-1", status: "in_process" });
    mocks.afip.GetAutomationDetails.mockResolvedValue({ id: "auto-1", status: "completed" });

    const start = await MisComprobantesTool.execute({
      t: "E",
      fechaEmision: "01/06/2026 - 30/06/2026",
      puntosVenta: [1],
      wait: true,
    });
    const details = await GetAutomationDetailsTool.execute({ id: "auto-1", wait: true });

    expect(start.content[0].text).toContain("ID: auto-1");
    expect(parseContent(start, 1)).toEqual({ id: "auto-1", status: "in_process" });
    expect(parseContent(details)).toEqual({ id: "auto-1", status: "completed" });
    expect(mocks.afip.CreateAutomation).toHaveBeenCalledWith(
      "mis-comprobantes",
      expect.objectContaining({
        cuit: "20123456789",
        username: "20123456789",
        password: "secret",
        filters: { t: "E", fechaEmision: "01/06/2026 - 30/06/2026", puntosVenta: [1] },
      }),
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

    expect(
      parseContent(
        await MisComprobantesTool.execute({ t: "E", fechaEmision: "01/06/2026 - 30/06/2026" }),
      ),
    ).toEqual({ success: false, error: "automation failed" });
    expect(parseContent(await GetAutomationDetailsTool.execute({ id: "auto-1" }))).toEqual({
      success: false,
      error: "details failed",
    });
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
