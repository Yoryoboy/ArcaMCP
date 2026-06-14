import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateVoucherPromptArgsSchema } from "./CreateVoucherPrompt.schemas.js";

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

    expect(modoNumeracionField._def.complete("AU")).toEqual(["automatico"]);
    expect(
      tipoComprobanteField._def.complete("1", { arguments: { concepto: "2" } }),
    ).toEqual(["11", "1"]);
    expect(monedaField._def.complete("d")).toEqual(["DOL"]);
    expect(cotizacionField._def.complete("", { arguments: { moneda: "DOL" } })).toEqual([]);
    expect(cotizacionField._def.complete("1", { arguments: {} })).toEqual(["1"]);
    expect(condicionIVAReceptorField._def.complete("1")).toEqual([
      "1",
      "10",
      "13",
      "15",
      "16",
    ]);
    expect(importeTributosField._def.complete("")).toEqual(["0"]);
    expect(cantidadRegistrosField._def.complete("")).toEqual(["1"]);
  });

  it("suggests fallback values for nullable concept, sales point, and document completions", () => {
    const conceptoField = CreateVoucherPromptArgsSchema.shape.concepto.unwrap();
    const puntoDeVentaField = CreateVoucherPromptArgsSchema.shape.puntoDeVenta.unwrap();
    const tipoDocumentoField = CreateVoucherPromptArgsSchema.shape.tipoDocumento.unwrap();

    expect(conceptoField._def.complete(undefined)).toEqual(["1", "2", "3"]);
    expect(conceptoField._def.complete("3")).toEqual(["3"]);
    expect(puntoDeVentaField._def.complete(undefined)).toEqual(["1"]);
    expect(puntoDeVentaField._def.complete("9")).toEqual([]);
    expect(tipoDocumentoField._def.complete(undefined)).toEqual(["99", "96", "80"]);
    expect(tipoDocumentoField._def.complete("8")).toEqual(["80"]);
  });

  it("suggests nearby voucher dates deterministically", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));

    const fechaComprobanteField = CreateVoucherPromptArgsSchema.shape.fechaComprobante.unwrap();

    expect(fechaComprobanteField._def.complete("")).toEqual([
      "20260614",
      "20260613",
      "20260615",
    ]);
    expect(fechaComprobanteField._def.complete("2026061")).toEqual([
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
      fechaServicioDesdeField._def.complete("", {
        arguments: { concepto: "2", fechaComprobante: "20260614" },
      }),
    ).toEqual(["20260614"]);
    expect(
      fechaServicioDesdeField._def.complete("", {
        arguments: { concepto: "1", fechaComprobante: "20260614" },
      }),
    ).toEqual([]);

    expect(
      fechaServicioHastaField._def.complete("", {
        arguments: { concepto: "3", fechaServicioDesde: "20260610" },
      }),
    ).toEqual(["20260610"]);
    expect(
      fechaServicioHastaField._def.complete("", {
        arguments: { concepto: "3" },
      }),
    ).toEqual([]);
    expect(
      fechaServicioHastaField._def.complete("", {
        arguments: { concepto: "1", fechaServicioDesde: "20260610" },
      }),
    ).toEqual([]);

    expect(
      fechaVencimientoPagoField._def.complete("", {
        arguments: { fechaComprobante: "20260614" },
      }),
    ).toEqual(["20260614"]);
    expect(fechaVencimientoPagoField._def.complete("", { arguments: {} })).toEqual([]);
  });

  it("only suggests computed totals for factura C with numeric inputs", () => {
    const importeTotalField = CreateVoucherPromptArgsSchema.shape.importeTotal.unwrap();

    expect(
      importeTotalField._def.complete("", {
        arguments: {
          tipoComprobante: "11",
          importeNeto: "100",
          importeTributos: "5",
        },
      }),
    ).toEqual(["105"]);
    expect(
      importeTotalField._def.complete("", {
        arguments: {
          tipoComprobante: "6",
          importeNeto: "100",
          importeTributos: "5",
        },
      }),
    ).toEqual([]);
    expect(
      importeTotalField._def.complete("", {
        arguments: {
          tipoComprobante: "11",
          importeNeto: "abc",
          importeTributos: "5",
        },
      }),
    ).toEqual([]);
  });
});
