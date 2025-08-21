import { z } from "zod";

// Helpers ---------------------------------------------------------------

const toNumber = (value: unknown): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  // Will be caught by Zod refines
  return NaN;
};

const toInt = (value: unknown): number => {
  const n = toNumber(value);
  return Math.trunc(n);
};

const isAllDigits = (s: string) => /^\d+$/.test(s);

// Normaliza CbteFch a formato yyyyMMdd aceptando también YYYY-MM-DD
const normalizeCbteFch = (value: unknown): string => {
  if (typeof value !== "string") return String(value ?? "");
  const s = value.trim();
  if (/^\d{8}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  return s; // let refinement handle invalid format
};

// Aceptar aliases en estilo QR (lowercase) y mapearlos a nombres consistentes con los vouchers
const aliasPreprocess = (input: unknown): unknown => {
  if (!input || typeof input !== "object") return input;
  const o = input as Record<string, any>;
  const out: Record<string, any> = { ...o };

  if (o["fecha"] && out["CbteFch"] === undefined) {
    out["CbteFch"] = String(o["fecha"]).replaceAll("-", "");
  }
  if (o["ptoVta"] !== undefined && out["PtoVta"] === undefined)
    out["PtoVta"] = o["ptoVta"];
  if (o["tipoCmp"] !== undefined && out["CbteTipo"] === undefined)
    out["CbteTipo"] = o["tipoCmp"];
  if (o["nroCmp"] !== undefined && out["CbteNro"] === undefined)
    out["CbteNro"] = o["nroCmp"];
  if (o["importe"] !== undefined && out["ImpTotal"] === undefined)
    out["ImpTotal"] = o["importe"];
  if (o["moneda"] !== undefined && out["MonId"] === undefined)
    out["MonId"] = o["moneda"];
  if (o["ctz"] !== undefined && out["MonCotiz"] === undefined)
    out["MonCotiz"] = o["ctz"];
  if (o["tipoDocRec"] !== undefined && out["DocTipo"] === undefined)
    out["DocTipo"] = o["tipoDocRec"];
  if (o["nroDocRec"] !== undefined && out["DocNro"] === undefined)
    out["DocNro"] = o["nroDocRec"];
  if (o["tipoCodAut"] !== undefined && out["TipoCodAut"] === undefined)
    out["TipoCodAut"] = o["tipoCodAut"];
  if (o["codAut"] !== undefined && out["CodAut"] === undefined)
    out["CodAut"] = o["codAut"];
  if (o["ver"] !== undefined && out["Ver"] === undefined) out["Ver"] = o["ver"];
  if (o["cuit"] !== undefined && out["Cuit"] === undefined)
    out["Cuit"] = o["cuit"];

  return out;
};

// Schema base (ZodObject) -----------------------------------------------
const GenerateQRBaseSchema = z.object({
  Ver: z.literal(1).default(1).describe("Versión del esquema QR (actual: 1)"),

  // Fecha del comprobante (consistente con vouchers)
  CbteFch: z
    .string()
    .transform(normalizeCbteFch)
    .refine(
      (s) => /^\d{8}$/.test(s),
      "Fecha del comprobante (yyyyMMdd). Para concepto=1: hasta 5 días anteriores/posteriores. Para 2 o 3: hasta 10 días. Si el usuario no especifica, usar la fecha actual"
    ),

  // CUIT emisor (11 dígitos)
  Cuit: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .refine((n) => Number.isFinite(n), "'Cuit' debe ser numérico")
    .refine((n) => n >= 0, "'Cuit' no puede ser negativo")
    .refine((n) => /^\d{11}$/.test(String(n)), "'Cuit' debe tener 11 dígitos"),

  // PtoVta: descripción idéntica a shared.schemas
  PtoVta: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .refine(
      (n) => Number.isInteger(n) && n >= 1,
      "Punto de venta del comprobante. Si se informan varios, deben corresponder al mismo punto de venta. Para obtener puntos de venta disponibles, usar tool get_sales_points. Si el usuario no especifica, se tiene que obtener sus puntos de venta disponibles y pedirle que elija uno"
    )
    .refine((n) => n <= 99999, "'PtoVta' debe tener hasta 5 dígitos"),

  // CbteTipo: descripción idéntica a shared.schemas
  CbteTipo: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .refine(
      (n) => Number.isInteger(n) && n >= 1,
      "Tipo de comprobante informado. Si se informa más de uno, todos deben ser del mismo tipo. Para obtener tipos de comprobantes disponibles, usar tool get_voucher_types. Si el usuario no ha especificado el tipo de Factura, se tiene que obtener sus tipos de comprobantes disponibles y recomendarle elegir uno."
    )
    .refine((n) => n <= 999, "'CbteTipo' debe tener hasta 3 dígitos"),

  // Número de comprobante (consistencia con vouchers)
  CbteNro: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .refine((n) => Number.isInteger(n) && n > 0, "Número de comprobante")
    .refine((n) => n <= 99999999, "'CbteNro' debe tener hasta 8 dígitos"),

  // Importes y moneda: descripciones idénticas a shared.schemas
  ImpTotal: z
    .union([z.number(), z.string()])
    .transform(toNumber)
    .refine(
      (n) => Number.isFinite(n) && n >= 0,
      "Importe total del comprobante. Fórmula: Importe no gravado + Importe exento + Importe neto gravado + IVA + tributos. Si el monto es por menos de 10000000 de pesos (10 millones) y es para consumidor Final, no es necesario declarar los datos del receptor del comprobante. (DocNro puede ser omitido)"
    ),

  MonId: z
    .string()
    .transform((s) => s.trim().toUpperCase())
    .refine(
      (s) => /^[A-Z]{3}$/.test(s),
      "Código de moneda (ej: PES). Consultar método FEParamGetTiposMonedas"
    ),

  MonCotiz: z
    .union([z.number(), z.string()])
    .transform(toNumber)
    .refine(
      (n) => Number.isFinite(n) && n > 0,
      "Cotización de la moneda. Para PES debe ser 1"
    ),

  // Documento del receptor: descripciones idénticas a shared.schemas
  DocTipo: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .optional()
    .refine(
      (n) => n === undefined || [80, 96, 99].includes(n),
      "Código de documento del comprador. Ej: 80=CUIT, 96=DNI, 99=Consumidor Final"
    ),

  DocNro: z
    .union([z.number(), z.string()])
    .transform(toInt)
    .optional()
    .refine(
      (n) => n === undefined || (Number.isInteger(n) && n >= 0),
      "Número de identificación del comprador. Si el monto (ImpTotal) es por menos de 10000000 de pesos (10 millones) y es para consumidor Final, no es necesario declarar los datos del receptor del comprobante. (DocNro puede ser omitido)"
    ),

  // Autorización
  TipoCodAut: z
    .enum(["E", "A"])
    .default("E")
    .describe("Tipo de código de autorización (E = CAE, A = CAEA)"),
  CodAut: z.union([z.string(), z.number()]).transform((v) => String(v)),
});

export const GenerateQRInputSchema = GenerateQRBaseSchema;

// Schema con preprocesamiento (aliases) y refinamientos ------------------
export const GenerateQRSchema = z
  .preprocess(aliasPreprocess, GenerateQRBaseSchema)
  .superRefine((obj: any, ctx) => {
    // DocTipo y DocNro deben venir juntos o ambos ausentes
    const docPairOk =
      (obj.DocTipo === undefined && obj.DocNro === undefined) ||
      (obj.DocTipo !== undefined && obj.DocNro !== undefined);
    if (!docPairOk) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DocNro"],
        message: "'DocTipo' y 'DocNro' deben informarse juntos o no informarse",
      });
    }

    // Validación de CodAut numérico de 14 dígitos
    const cod = (obj.CodAut ?? "").toString();
    if (!isAllDigits(cod)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CodAut"],
        message: "'CodAut' debe ser numérico (solo dígitos)",
      });
    }
    if (cod.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CodAut"],
        message: "'CodAut' (CAE) debe tener 14 dígitos",
      });
    }

    // Moneda PES debe tener cotización 1
    if (obj.MonId === "PES" && Number(obj.MonCotiz) !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["MonCotiz"],
        message: "'MonCotiz' debe ser 1 cuando 'MonId' = 'PES'",
      });
    }
  });
