type VoucherPromptContext = Record<string, unknown> & {
  arguments?: Record<string, unknown>;
};

function readStringArgument(
  context: VoucherPromptContext | undefined,
  key: string,
): string | undefined {
  const value = context?.arguments?.[key] ?? context?.[key];

  return typeof value === "string" ? value : undefined;
}

export function startsWithAny(
  values: readonly string[],
  prefix = "",
  normalize: (value: string) => string = (value) => value,
): string[] {
  const normalizedPrefix = normalize(prefix);

  return values.filter((value) => normalize(value).startsWith(normalizedPrefix));
}

export function formatVoucherDate(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

// AFIP validates voucher dates against the Argentine calendar, not the host's.
const argentineCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Argentina/Buenos_Aires",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function argentineDay(offsetDays: number): Date {
  const parts = Object.fromEntries(
    argentineCalendar.formatToParts(new Date()).map((part) => [part.type, Number(part.value)]),
  );
  // A local noon date keeps formatVoucherDate's local getters on the intended day.
  return new Date(parts.year, parts.month - 1, parts.day + offsetDays, 12);
}

export function suggestNearbyVoucherDates(value?: string): string[] {
  return startsWithAny([0, -1, 1].map((offset) => formatVoucherDate(argentineDay(offset))), value);
}

export function suggestVoucherType(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const concepto = readStringArgument(context, "concepto");
  const ordered = concepto === "1" || concepto === "3" ? ["11", "6", "1"] : ["11", "6", "1"];

  return startsWithAny(ordered, value);
}

export function suggestCurrencyQuote(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const moneda = readStringArgument(context, "moneda")?.toUpperCase();

  if (!moneda || moneda === "PES") {
    return startsWithAny(["1"], value);
  }

  return [];
}

export function suggestServiceDateFrom(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const concepto = readStringArgument(context, "concepto");

  if (concepto === "2" || concepto === "3") {
    const fechaComprobante = readStringArgument(context, "fechaComprobante");

    return startsWithAny(fechaComprobante ? [fechaComprobante] : [], value);
  }

  return [];
}

export function suggestServiceDateUntil(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const concepto = readStringArgument(context, "concepto");

  if (concepto === "2" || concepto === "3") {
    const fechaServicioDesde = readStringArgument(context, "fechaServicioDesde");

    return startsWithAny(fechaServicioDesde ? [fechaServicioDesde] : [], value);
  }

  return [];
}

export function suggestPaymentDueDate(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const fechaComprobante = readStringArgument(context, "fechaComprobante");

  return startsWithAny(fechaComprobante ? [fechaComprobante] : [], value);
}

export function suggestInvoiceTotal(
  value?: string,
  context?: VoucherPromptContext,
): string[] {
  const tipoComprobante = readStringArgument(context, "tipoComprobante");
  const importeNeto = Number.parseFloat(String(context?.arguments?.["importeNeto"] ?? context?.["importeNeto"] ?? ""));
  const importeTributos = Number.parseFloat(String(context?.arguments?.["importeTributos"] ?? context?.["importeTributos"] ?? ""));

  if (tipoComprobante === "11" && !Number.isNaN(importeNeto) && !Number.isNaN(importeTributos)) {
    return startsWithAny([String(importeNeto + importeTributos)], value);
  }

  return [];
}
