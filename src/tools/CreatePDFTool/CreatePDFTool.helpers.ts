import type { CreatePDFResolvedInput } from "./CreatePDFTool.schemas.js";
import path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function formatDateDDMMYYYY(yyyymmdd?: string): string {
  if (!yyyymmdd) return "";
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

export function formatDateISO(yyyymmdd?: string): string {
  if (!yyyymmdd) return "";
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function formatAmountAR(n: number): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function renderItems(items: CreatePDFResolvedInput["INVOICE_ITEMS"] | undefined): string {
  if (!items || items.length === 0) {
    return "";
  }
  const rows = items
    .map((it: CreatePDFResolvedInput["INVOICE_ITEMS"][number], idx: number) => {
      const cantidad = formatAmountAR(it.cantidad);
      const precioUnit = formatAmountAR(it.precioUnitario);
      const importe = formatAmountAR(it.importe);
      const codigo = String(idx + 1).padStart(3, "0");
      return `
        <tr>
          <td>${codigo}</td>
          <td>${it.descripcion.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
          <td>${cantidad}</td>
          <td>Unidad</td>
          <td>${precioUnit}</td>
          <td>0,00</td>
          <td>0,00</td>
          <td>${importe}</td>
        </tr>
      `;
    })
    .join("");
  return rows;
}

export function findTemplate(): string {
  const candidates = [
    path.resolve(process.cwd(), "templates/bill.html"),
    path.resolve(__dirname, "../../../templates/bill.html"),
    path.resolve(__dirname, "../../templates/bill.html"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      "No se encontró la plantilla HTML 'templates/bill.html'. Asegúrate de que exista en la raíz del proyecto.",
    );
  }
  return fs.readFileSync(found, "utf8");
}

// ---------------------------------------------------------------------------
// Extracted pure functions to reduce execute() complexity (FA-003)
// ---------------------------------------------------------------------------

/**
 * Converts optional DocNro string to a number if safe; returns undefined otherwise.
 * Omits values exceeding MAX_SAFE_INTEGER to avoid precision loss in QR data.
 */
function maybeToNumber(v?: string): number | undefined {
  if (!v) return undefined;
  if (/^\d+$/.test(v) && v.length <= 15) return Number(v);
  return undefined;
}

/**
 * Builds the raw QR payload object (before schema validation) from the parsed input.
 */
export function buildQrPayload(input: CreatePDFResolvedInput) {
  return {
    ver: 1 as const,
    fecha: formatDateISO(input.CbteFch),
    cuit: Number(input.CUIT_EMISOR),
    ptoVta: input.PtoVta,
    tipoCmp: input.CbteTipo,
    nroCmp: input.CbteNro,
    importe: input.IMPORTE_TOTAL,
    moneda: input.MonId,
    ctz: input.MonCotiz,
    ...(input.DocNro ? { tipoDocRec: 80 as number } : {}),
    ...(input.DocNro ? { nroDocRec: maybeToNumber(input.DocNro) } : {}),
    tipoCodAut: input.TipoCodAut,
    codAut: Number(input.CAE_NUMBER),
  };
}

/**
 * Builds the placeholder → value replacement map for the HTML template.
 */
export function buildReplacementMap(
  input: CreatePDFResolvedInput,
  qrDataUrl: string,
): Record<string, string> {
  return {
    "{{CbteLetra}}": String(input.CbteLetra),
    "{{NOMBRE_EMISOR}}": input.NOMBRE_EMISOR,
    "{{CUIT_EMISOR}}": input.CUIT_EMISOR,
    "{{DIRECCION_EMISOR}}": input.DIRECCION_EMISOR,
    "{{CondicionIVAEmisor}}": input.CondicionIVAEmisor,
    "{{INGRESOS_BRUTOS}}": renderIngresosBrutos(input.INGRESOS_BRUTOS),
    "{{FECHA_INICIO_ACTIVIDADES}}": `${input.FECHA_INICIO_ACTIVIDADES.slice(8, 10)}/${input.FECHA_INICIO_ACTIVIDADES.slice(5, 7)}/${input.FECHA_INICIO_ACTIVIDADES.slice(0, 4)}`,
    "{{PtoVta}}": input.PtoVta.toString().padStart(5, "0"),
    "{{CbteNro}}": input.CbteNro.toString().padStart(8, "0"),
    "{{CbteFch}}": formatDateDDMMYYYY(input.CbteFch),
    "{{DocNro}}": input.DocNro ? String(input.DocNro) : "",
    "{{NOMBRE_RECEPTOR}}": input.NOMBRE_RECEPTOR,
    "{{CondicionIVAReceptor}}": input.CondicionIVAReceptor,
    "{{DIRECCION_RECEPTOR}}": input.DIRECCION_RECEPTOR ?? "",
    "{{CONDICION_PAGO}}": input.CONDICION_PAGO ?? "",
    "{{FchServDesde}}": input.FchServDesde ? formatDateDDMMYYYY(input.FchServDesde) : "",
    "{{FchServHasta}}": input.FchServHasta ? formatDateDDMMYYYY(input.FchServHasta) : "",
    "{{FchVtoPago}}": input.FchVtoPago ? formatDateDDMMYYYY(input.FchVtoPago) : "",
    "{{SUBTOTAL}}": formatAmountAR(input.SUBTOTAL),
    "{{IMPORTE_OTROS_TRIBUTOS}}": formatAmountAR(input.IMPORTE_OTROS_TRIBUTOS ?? 0),
    "{{IMPORTE_TOTAL}}": formatAmountAR(input.IMPORTE_TOTAL),
    "{{CAE_NUMBER}}": String(input.CAE_NUMBER),
    "{{CAE_EXPIRY_DATE}}": formatDateDDMMYYYY(input.CAE_EXPIRY_DATE),
    "{{QR_CODE_DATA}}": qrDataUrl,
    "{{INVOICE_ITEMS}}": renderItems(input.INVOICE_ITEMS),
  };
}

/**
 * Applies placeholder replacements to the HTML template string.
 */
export function applyReplacements(html: string, replacements: Record<string, string>): string {
  let result = html;
  for (const [ph, val] of Object.entries(replacements)) {
    result = result.split(ph).join(val ?? "");
  }
  return result;
}

/**
 * Builds the PDF filename from input fields.
 */
export function renderIngresosBrutos(ingresos: CreatePDFResolvedInput["INGRESOS_BRUTOS"]): string {
  if (ingresos.condicion === "Local" || ingresos.condicion === "Convenio Multilateral") {
    return `${ingresos.condicion} - Inscripción IIBB: ${ingresos.numeroInscripcion}`;
  }
  return ingresos.condicion;
}

export function buildFileName(input: CreatePDFResolvedInput): string {
  return `Factura_${input.CbteLetra}_${String(input.PtoVta).padStart(
    5,
    "0",
  )}_${String(input.CbteNro).padStart(8, "0")}`;
}
