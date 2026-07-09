import { afterEach, describe, expect, it, vi } from "vitest";
import { getCompleter } from "@modelcontextprotocol/sdk/server/completable.js";
import { CreateVoucherPromptArgsSchema } from "./CreateVoucherPrompt.schemas.js";

function requiredCompleter<T extends Parameters<typeof getCompleter>[0]>(field: T) {
  const completer = getCompleter(field);

  if (!completer) {
    throw new Error("Expected completer to be defined");
  }

  return completer;
}

describe("CreateVoucherPromptArgsSchema", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts valid string-based prompt args", () => {
    const result = CreateVoucherPromptArgsSchema.safeParse({
      modoNumeracion: "automatico",
      concepto: "2",
      tipoComprobante: "11",
      puntoDeVenta: "1",
      moneda: "PES",
      cotizacion: "1",
      tipoDocumento: "99",
      numeroDocumento: "",
      condicionIVAReceptor: "5",
      fechaComprobante: "20260614",
      fechaServicioDesde: "20260614",
      fechaServicioHasta: "20260614",
      fechaVencimientoPago: "20260614",
      importeTotal: "100",
      importeNeto: "100",
      importeTributos: "0",
      cantidadRegistros: "1",
      comprobanteDesde: "123",
      comprobanteHasta: "123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects non-string values for prompt args", () => {
    const result = CreateVoucherPromptArgsSchema.safeParse({
      tipoComprobante: 11,
      importeTotal: 100,
    });

    expect(result.success).toBe(false);
  });

  it("filters basic completable suggestions with prefixes and context", () => {
    const modoNumeracionField = CreateVoucherPromptArgsSchema.shape.modoNumeracion.unwrap();
    const tipoComprobanteField = CreateVoucherPromptArgsSchema.shape.tipoComprobante.unwrap();
    const monedaField = CreateVoucherPromptArgsSchema.shape.moneda.unwrap();
    const cotizacionField = CreateVoucherPromptArgsSchema.shape.cotizacion.unwrap();
    const condicionIVAReceptorField =
      CreateVoucherPromptArgsSchema.shape.condicionIVAReceptor.unwrap();
    const importeTributosField = CreateVoucherPromptArgsSchema.shape.importeTributos.unwrap();
    const cantidadRegistrosField = CreateVoucherPromptArgsSchema.shape.cantidadRegistros.unwrap();

    expect(requiredCompleter(modoNumeracionField)("AU")).toEqual(["automatico"]);
    expect(
      requiredCompleter(tipoComprobanteField)("1", { arguments: { concepto: "2" } }),
    ).toEqual(["11", "1"]);
    expect(requiredCompleter(monedaField)("d")).toEqual(["DOL"]);
    expect(requiredCompleter(cotizacionField)("", { arguments: { moneda: "DOL" } })).toEqual([]);
    expect(requiredCompleter(cotizacionField)("1", { arguments: {} })).toEqual(["1"]);
    expect(requiredCompleter(condicionIVAReceptorField)("1")).toEqual([
      "1",
      "10",
      "13",
      "15",
      "16",
    ]);
    expect(requiredCompleter(importeTributosField)("")).toEqual(["0"]);
    expect(requiredCompleter(cantidadRegistrosField)("")).toEqual(["1"]);
  });

  it("suggests fallback values for nullable concept, sales point, and document completions", () => {
    const conceptoField = CreateVoucherPromptArgsSchema.shape.concepto.unwrap();
    const puntoDeVentaField = CreateVoucherPromptArgsSchema.shape.puntoDeVenta.unwrap();
    const tipoDocumentoField = CreateVoucherPromptArgsSchema.shape.tipoDocumento.unwrap();

    expect(requiredCompleter(conceptoField)("")).toEqual(["1", "2", "3"]);
    expect(requiredCompleter(conceptoField)("3")).toEqual(["3"]);
    expect(requiredCompleter(puntoDeVentaField)("")).toEqual(["1"]);
    expect(requiredCompleter(puntoDeVentaField)("9")).toEqual([]);
    expect(requiredCompleter(tipoDocumentoField)("")).toEqual(["99", "96", "80"]);
    expect(requiredCompleter(tipoDocumentoField)("8")).toEqual(["80"]);
  });

  it("suggests nearby voucher dates deterministically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));

    const fechaComprobanteField = CreateVoucherPromptArgsSchema.shape.fechaComprobante.unwrap();

    expect(requiredCompleter(fechaComprobanteField)("")).toEqual([
      "20260614",
      "20260613",
      "20260615",
    ]);
    expect(requiredCompleter(fechaComprobanteField)("2026061")).toEqual([
      "20260614",
      "20260613",
      "20260615",
    ]);
  });

  it("only suggests service dates when service concepts provide the required anchors", () => {
    const fechaServicioDesdeField =
      CreateVoucherPromptArgsSchema.shape.fechaServicioDesde.unwrap();
    const fechaServicioHastaField =
      CreateVoucherPromptArgsSchema.shape.fechaServicioHasta.unwrap();
    const fechaVencimientoPagoField =
      CreateVoucherPromptArgsSchema.shape.fechaVencimientoPago.unwrap();

    expect(
      requiredCompleter(fechaServicioDesdeField)("", {
        arguments: { concepto: "2", fechaComprobante: "20260614" },
      }),
    ).toEqual(["20260614"]);
    expect(
      requiredCompleter(fechaServicioDesdeField)("", {
        arguments: { concepto: "1", fechaComprobante: "20260614" },
      }),
    ).toEqual([]);

    expect(
      requiredCompleter(fechaServicioHastaField)("", {
        arguments: { concepto: "3", fechaServicioDesde: "20260610" },
      }),
    ).toEqual(["20260610"]);
    expect(
      requiredCompleter(fechaServicioHastaField)("", {
        arguments: { concepto: "3" },
      }),
    ).toEqual([]);
    expect(
      requiredCompleter(fechaServicioHastaField)("", {
        arguments: { concepto: "1", fechaServicioDesde: "20260610" },
      }),
    ).toEqual([]);

    expect(
      requiredCompleter(fechaVencimientoPagoField)("", {
        arguments: { fechaComprobante: "20260614" },
      }),
    ).toEqual(["20260614"]);
    expect(requiredCompleter(fechaVencimientoPagoField)("", { arguments: {} })).toEqual([]);
  });

  it("only suggests computed totals for factura C with numeric inputs", () => {
    const importeTotalField = CreateVoucherPromptArgsSchema.shape.importeTotal.unwrap();

    expect(
      requiredCompleter(importeTotalField)("", {
        arguments: {
          tipoComprobante: "11",
          importeNeto: "100",
          importeTributos: "5",
        },
      }),
    ).toEqual(["105"]);
    expect(
      requiredCompleter(importeTotalField)("", {
        arguments: {
          tipoComprobante: "6",
          importeNeto: "100",
          importeTributos: "5",
        },
      }),
    ).toEqual([]);
    expect(
      requiredCompleter(importeTotalField)("", {
        arguments: {
          tipoComprobante: "11",
          importeNeto: "abc",
          importeTributos: "5",
        },
      }),
    ).toEqual([]);
  });
});
