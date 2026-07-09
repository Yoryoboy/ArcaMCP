import { describe, expect, it } from "vitest";

import {
  buildMisComprobantesAutomationData,
  buildMisComprobantesFilters,
} from "./MisComprobantesTool.helpers.js";

describe("MisComprobantesTool helpers", () => {
  it("builds filters only from defined values and preserves empty arrays", () => {
    expect(
      buildMisComprobantesFilters({
        t: "E",
        fechaEmision: "01/06/2026 - 14/06/2026",
        puntosVenta: [],
        tiposComprobantes: [],
        comprobanteDesde: 1,
        comprobanteHasta: 10,
        tipoDoc: 80,
        nroDoc: undefined,
        codigoAutorizacion: undefined,
        wait: false,
      }),
    ).toEqual({
      t: "E",
      fechaEmision: "01/06/2026 - 14/06/2026",
      puntosVenta: [],
      tiposComprobantes: [],
      comprobanteDesde: 1,
      comprobanteHasta: 10,
      tipoDoc: 80,
    });
  });

  it("builds automation payload with required filters and omits undefined optional ones", () => {
    expect(
      buildMisComprobantesAutomationData(
        {
          t: "R",
          fechaEmision: "01/06/2026 - 14/06/2026",
          wait: false,
        },
        {
          CUIT: "20123456789",
          PASSWORD: "secret",
        },
      ),
    ).toEqual({
      cuit: "20123456789",
      username: "20123456789",
      password: "secret",
      filters: {
        t: "R",
        fechaEmision: "01/06/2026 - 14/06/2026",
      },
    });
  });

  it("builds automation payload with filters when at least one filter is defined", () => {
    expect(
      buildMisComprobantesAutomationData(
        {
          t: "E",
          fechaEmision: "01/06/2026 - 14/06/2026",
          puntosVenta: [1],
          wait: false,
        },
        {
          CUIT: "20123456789",
          PASSWORD: "secret",
        },
      ),
    ).toEqual({
      cuit: "20123456789",
      username: "20123456789",
      password: "secret",
      filters: {
        t: "E",
        fechaEmision: "01/06/2026 - 14/06/2026",
        puntosVenta: [1],
      },
    });
  });
});
