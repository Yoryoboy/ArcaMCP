import type { CreatePDFInput } from "./CreatePDFTool.schemas.js";
import path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function formatDateDDMMYYYY(yyyymmdd?: string): string {
  if (!yyyymmdd) return "";
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(
    0,
    4
  )}`;
}

export function formatDateISO(yyyymmdd?: string): string {
  if (!yyyymmdd) return "";
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(
    6,
    8
  )}`;
}

export function formatAmountAR(n: number): string {
  return n.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function renderItems(items: CreatePDFInput["INVOICE_ITEMS"]): string {
  if (!items || items.length === 0) {
    return "";
  }
  const rows = items
    .map((it: CreatePDFInput["INVOICE_ITEMS"][number], idx: number) => {
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
      "No se encontró la plantilla HTML 'templates/bill.html'. Asegúrate de que exista en la raíz del proyecto."
    );
  }
  return fs.readFileSync(found, "utf8");
}
