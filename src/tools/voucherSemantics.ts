/**
 * Validación semántica de comprobantes AFIP.
 *
 * Estas reglas cruzan múltiples campos y no pueden expresarse como validaciones
 * de campo individual en Zod. Se aplican vía `superRefine` en los schemas de
 * creación de comprobantes para rechazar localmente payloads que AFIP rechazaría
 * con un error críptico, mejorando la experiencia del agente.
 *
 * Cada regla está alineada con un error conocido de AFIP (p.ej. 10049, 10032)
 * o con una restricción documentada en los campos del comprobante.
 */
import { z } from "zod";

// -----------------------------------------------------------------------------
// Tipos estructurales mínimos (evitan import circular con shared.schemas).
// -----------------------------------------------------------------------------

export interface VoucherSemanticFields {
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro?: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
  FchServDesde?: string;
  FchServHasta?: string;
  FchVtoPago?: string;
  Iva?: ReadonlyArray<{ Id: number; BaseImp: number; Importe: number }>;
}

export interface VoucherRangeFields {
  CantReg: number;
  CbteDesde: number;
  CbteHasta: number;
}

// -----------------------------------------------------------------------------
// Constantes de dominio.
// -----------------------------------------------------------------------------

/** Tipos de comprobante clase C (del mapeo de error AFIP 10007). */
export const TIPO_C_SET: ReadonlySet<number> = new Set([
  11, 12, 13, 15, 211, 212, 213,
]);

/** DocTipo 99 = Consumidor Final. */
export const CONSUMIDOR_FINAL_DOC_TIPO = 99;

/** Umbral ARS bajo el cual un Consumidor Final puede omitir DocNro. */
export const DOCNRO_OPTIONAL_THRESHOLD = 10_000_000;

/** Tolerancia de punto flotante para la consistencia de totales (un centavo). */
export const TOTAL_TOLERANCE = 0.01;

/** Tope superior del rango de numeración de comprobantes. */
export const MAX_VOUCHER_NUMBER = 99_999_999;

// -----------------------------------------------------------------------------
// Helpers de fechas.
// -----------------------------------------------------------------------------

const AFIP_DATE_RE = /^\d{8}$/;

/**
 * Valida una fecha AFIP en formato yyyyMMdd. Exige 8 dígitos y una fecha de
 * calendario real (mes 01-12 y día válido para ese mes/año). Es determinística:
 * no depende de la fecha actual.
 */
export function isValidAfipDate(value: string): boolean {
  if (typeof value !== "string" || !AFIP_DATE_RE.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Round-trip a través de Date para detectar días inexistentes (p.ej. 31/02).
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Indica si un tipo de comprobante es clase C. */
export function isTipoC(cbteTipo: number): boolean {
  return TIPO_C_SET.has(cbteTipo);
}

/** True si el concepto incluye servicios (2=Servicios, 3=Productos y Servicios). */
function hasServices(concepto: number): boolean {
  return concepto === 2 || concepto === 3;
}

function addIssue(
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
}

// -----------------------------------------------------------------------------
// Validación semántica del núcleo del comprobante.
// -----------------------------------------------------------------------------

/**
 * Valida las reglas semánticas compartidas por create_voucher y create_next_voucher.
 * Pensada para usarse dentro de `superRefine`. No lanza: agrega issues al contexto.
 */
export function validateVoucherCoreSemantics(
  data: VoucherSemanticFields,
  ctx: z.RefinementCtx,
): void {
  validateDateFormats(data, ctx);
  validateServiceDates(data, ctx);
  validateTotals(data, ctx);
  validateTipoC(data, ctx);
  validateCurrency(data, ctx);
  validateDocNro(data, ctx);
}

/** Regla: todas las fechas presentes deben ser yyyyMMdd válidas. */
function validateDateFormats(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  const dateFields = [
    ["CbteFch", data.CbteFch],
    ["FchServDesde", data.FchServDesde],
    ["FchServHasta", data.FchServHasta],
    ["FchVtoPago", data.FchVtoPago],
  ] as const;

  for (const [field, value] of dateFields) {
    if (value !== undefined && !isValidAfipDate(value)) {
      addIssue(
        ctx,
        [field],
        `${field} debe ser una fecha válida en formato yyyyMMdd (ej. 20260614). Recibido: ${JSON.stringify(value)}.`,
      );
    }
  }
}

/**
 * Reglas de fechas de servicio según concepto:
 * - Concepto 2 o 3: FchServDesde, FchServHasta y FchVtoPago son obligatorias.
 * - Concepto 1: no admite fechas de servicio.
 * - Orden: FchServHasta >= FchServDesde y FchVtoPago >= CbteFch.
 */
function validateServiceDates(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  const { Concepto, FchServDesde, FchServHasta, FchVtoPago, CbteFch } = data;

  if (hasServices(Concepto)) {
    if (FchServDesde === undefined) {
      addIssue(ctx, ["FchServDesde"], "FchServDesde es obligatorio cuando Concepto es 2 (Servicios) o 3 (Productos y Servicios).");
    }
    if (FchServHasta === undefined) {
      addIssue(ctx, ["FchServHasta"], "FchServHasta es obligatorio cuando Concepto es 2 (Servicios) o 3 (Productos y Servicios).");
    }
    if (FchVtoPago === undefined) {
      addIssue(ctx, ["FchVtoPago"], "FchVtoPago es obligatorio cuando Concepto es 2 (Servicios) o 3 (Productos y Servicios).");
    }
  } else if (Concepto === 1) {
    if (FchServDesde !== undefined || FchServHasta !== undefined || FchVtoPago !== undefined) {
      addIssue(
        ctx,
        ["Concepto"],
        "Concepto=1 (Productos) no admite fechas de servicio (FchServDesde/FchServHasta/FchVtoPago). Si el comprobante incluye servicios, usa Concepto=2 o 3.",
      );
    }
  }

  // Orden entre fechas de servicio (solo si ambas existen y son válidas).
  if (
    FchServDesde !== undefined &&
    FchServHasta !== undefined &&
    isValidAfipDate(FchServDesde) &&
    isValidAfipDate(FchServHasta) &&
    Number(FchServHasta) < Number(FchServDesde)
  ) {
    addIssue(ctx, ["FchServHasta"], "FchServHasta no puede ser anterior a FchServDesde.");
  }

  // El vencimiento de pago no puede ser anterior a la fecha del comprobante.
  if (
    FchVtoPago !== undefined &&
    CbteFch !== undefined &&
    isValidAfipDate(FchVtoPago) &&
    isValidAfipDate(CbteFch) &&
    Number(FchVtoPago) < Number(CbteFch)
  ) {
    addIssue(ctx, ["FchVtoPago"], "FchVtoPago no puede ser anterior a la fecha del comprobante (CbteFch).");
  }
}

/** Regla: ImpTotal debe equaler la suma de los componentes monetarios. */
function validateTotals(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  const { ImpTotal, ImpTotConc, ImpNeto, ImpOpEx, ImpIVA, ImpTrib } = data;
  const sum = ImpTotConc + ImpNeto + ImpOpEx + ImpIVA + ImpTrib;

  if (Math.abs(ImpTotal - sum) > TOTAL_TOLERANCE) {
    addIssue(
      ctx,
      ["ImpTotal"],
      `ImpTotal (${ImpTotal}) debe ser igual a ImpTotConc + ImpNeto + ImpOpEx + ImpIVA + ImpTrib (${sum}).`,
    );
  }
}

/**
 * Regla: los comprobantes clase C no discriminan IVA ni importes no gravados/exentos.
 * ImpTotConc, ImpOpEx e ImpIVA deben ser 0 y no debe informarse el array Iva.
 */
function validateTipoC(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  if (!isTipoC(data.CbteTipo)) {
    return;
  }

  if (data.ImpTotConc !== 0) {
    addIssue(ctx, ["ImpTotConc"], "Para comprobantes tipo C, ImpTotConc debe ser 0.");
  }
  if (data.ImpOpEx !== 0) {
    addIssue(ctx, ["ImpOpEx"], "Para comprobantes tipo C, ImpOpEx debe ser 0.");
  }
  if (data.ImpIVA !== 0) {
    addIssue(ctx, ["ImpIVA"], "Para comprobantes tipo C, ImpIVA debe ser 0 (el monotributo no discrimina IVA).");
  }
  if (data.Iva !== undefined && data.Iva.length > 0) {
    addIssue(ctx, ["Iva"], "Para comprobantes tipo C no debe informarse el array Iva.");
  }
}

/** Regla: para moneda PES la cotización debe ser 1. */
function validateCurrency(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  if (data.MonId === "PES" && data.MonCotiz !== 1) {
    addIssue(ctx, ["MonCotiz"], "Para MonId=PES, MonCotiz debe ser 1.");
  }
}

/**
 * Regla: DocNro es obligatorio salvo para Consumidor Final (DocTipo=99) con
 * ImpTotal menor al umbral, donde puede omitirse.
 */
function validateDocNro(data: VoucherSemanticFields, ctx: z.RefinementCtx): void {
  const docNroOptional =
    data.DocTipo === CONSUMIDOR_FINAL_DOC_TIPO &&
    data.ImpTotal < DOCNRO_OPTIONAL_THRESHOLD;

  if (!docNroOptional && data.DocNro === undefined) {
    addIssue(
      ctx,
      ["DocNro"],
      "DocNro es obligatorio, salvo para Consumidor Final (DocTipo=99) con ImpTotal menor a $10.000.000.",
    );
  }
}

// -----------------------------------------------------------------------------
// Validación de numeración manual (solo create_voucher).
// -----------------------------------------------------------------------------

/**
 * Reglas del rango de numeración manual:
 * - CbteDesde <= CbteHasta.
 * - Ambos dentro de [1, 99999999].
 * - CantReg debe ser CbteHasta - CbteDesde + 1.
 */
export function validateVoucherRangeSemantics(
  data: VoucherRangeFields,
  ctx: z.RefinementCtx,
): void {
  const { CantReg, CbteDesde, CbteHasta } = data;

  if (CbteDesde > CbteHasta) {
    addIssue(ctx, ["CbteDesde"], "CbteDesde no puede ser mayor que CbteHasta.");
  }

  if (CbteDesde > MAX_VOUCHER_NUMBER || CbteHasta > MAX_VOUCHER_NUMBER) {
    addIssue(ctx, ["CbteHasta"], `CbteDesde y CbteHasta no pueden exceder ${MAX_VOUCHER_NUMBER}.`);
  }

  const expectedCantReg = CbteHasta - CbteDesde + 1;
  if (CantReg !== expectedCantReg) {
    addIssue(
      ctx,
      ["CantReg"],
      `CantReg (${CantReg}) debe ser igual a CbteHasta - CbteDesde + 1 (${expectedCantReg}).`,
    );
  }
}
