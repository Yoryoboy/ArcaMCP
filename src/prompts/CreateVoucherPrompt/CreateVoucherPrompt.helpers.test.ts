import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatVoucherDate,
  suggestCurrencyQuote,
  suggestInvoiceTotal,
  suggestNearbyVoucherDates,
  suggestPaymentDueDate,
  suggestServiceDateFrom,
  suggestServiceDateUntil,
  suggestVoucherType,
  startsWithAny,
} from "./CreateVoucherPrompt.helpers.js";

describe("CreateVoucherPrompt helpers", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("filters suggestions by prefix without changing the source order", () => {
    expect(startsWithAny(["automatico", "manual"], "au")).toEqual(["automatico"]);
    expect(startsWithAny(["11", "6", "1"], "1")).toEqual(["11", "1"]);
  });

  it("formats voucher dates as yyyyMMdd", () => {
    expect(formatVoucherDate(new Date("2026-06-14T12:00:00Z"))).toBe("20260614");
  });

  it("suggests nearby voucher dates around the current day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T12:00:00Z"));

    expect(suggestNearbyVoucherDates("")).toEqual(["20260614", "20260613", "20260615"]);
    expect(suggestNearbyVoucherDates("2026061")).toEqual(["20260614", "20260613", "20260615"]);
  });

  it("prioritizes factura C voucher suggestions when concept is products or mixed", () => {
    expect(suggestVoucherType("", { concepto: "1" })).toEqual(["11", "6", "1"]);
    expect(suggestVoucherType("1", { concepto: "2" })).toEqual(["11", "1"]);
  });

  it("only suggests a currency quote for PES or missing currency", () => {
    expect(suggestCurrencyQuote("", { moneda: "PES" })).toEqual(["1"]);
    expect(suggestCurrencyQuote("1", {})).toEqual(["1"]);
    expect(suggestCurrencyQuote("", { moneda: "DOL" })).toEqual([]);
  });

  it("only suggests service dates when services are required", () => {
    expect(
      suggestServiceDateFrom("", { concepto: "2", fechaComprobante: "20260614" }),
    ).toEqual(["20260614"]);
    expect(suggestServiceDateFrom("", { concepto: "1", fechaComprobante: "20260614" })).toEqual(
      [],
    );

    expect(
      suggestServiceDateUntil("", { concepto: "3", fechaServicioDesde: "20260610" }),
    ).toEqual(["20260610"]);
    expect(suggestServiceDateUntil("", { concepto: "1", fechaServicioDesde: "20260610" })).toEqual(
      [],
    );
  });

  it("suggests the payment due date only when the invoice date exists", () => {
    expect(suggestPaymentDueDate("", { fechaComprobante: "20260614" })).toEqual(["20260614"]);
    expect(suggestPaymentDueDate("", {})).toEqual([]);
  });

  it("only suggests a computed total for factura C with numeric inputs", () => {
    expect(
      suggestInvoiceTotal("", {
        tipoComprobante: "11",
        importeNeto: "100",
        importeTributos: "5",
      }),
    ).toEqual(["105"]);
    expect(
      suggestInvoiceTotal("", {
        tipoComprobante: "6",
        importeNeto: "100",
        importeTributos: "5",
      }),
    ).toEqual([]);
    expect(
      suggestInvoiceTotal("", {
        tipoComprobante: "11",
        importeNeto: "abc",
        importeTributos: "5",
      }),
    ).toEqual([]);
  });
});
