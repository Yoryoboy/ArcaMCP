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

export function suggestNearbyVoucherDates(value?: string): string[] {
  const now = new Date();
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  return startsWithAny(
    [formatVoucherDate(today), formatVoucherDate(yesterday), formatVoucherDate(tomorrow)],
    value,
  );
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
