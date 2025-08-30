import { MCPResponse } from "../../core/types.js";
import { generateQRCode } from "../../utils/qr/qr.js";
import { QRDataSchema } from "../../utils/qr/qr.schema.js";
import { CreatePDFInputSchema } from "./CreatePDFTool.schemas.js";
import {
  findTemplate,
  formatDateISO,
  formatDateDDMMYYYY,
  formatAmountAR,
  renderItems,
} from "./CreatePDFTool.helpers.js";

// ------------------------------
// Tool implementation (Step 1: return populated HTML only)
// ------------------------------

export class CreatePDFTool {
  static readonly name = "create_pdf";

  static readonly metadata = {
    title: "Crear HTML de factura (fase 1)",
    description:
      "Genera HTML de factura dinámico a partir de placeholders del template bill.html. Incluye QR y render básico de ítems. No crea PDF en esta fase.",
    inputSchema: CreatePDFInputSchema.shape,
  };

  static async execute(params: unknown): Promise<MCPResponse> {
    try {
      // 1) Validación de entrada y normalización
      const input = CreatePDFInputSchema.parse(params);

      // 2) Leer template
      let html = findTemplate();

      // 3) Generar QR (usamos moneda PES y ctz 1 en esta fase)
      // Convertimos DocNro a número solo si es seguro; si no, lo omitimos del QR.
      const maybeToNumber = (v?: string) => {
        if (!v) return undefined;
        // Evitar pérdida si excede MAX_SAFE_INTEGER
        if (/^\d+$/.test(v) && v.length <= 15) return Number(v);
        return undefined; // omitimos receptor en QR si fuera demasiado largo
      };

      const qrPayload = {
        ver: 1 as const,
        fecha: formatDateISO(input.CbteFch),
        cuit: Number(input.CUIT_EMISOR),
        ptoVta: input.PtoVta,
        tipoCmp: input.CbteTipo,
        nroCmp: input.CbteNro,
        importe: input.IMPORTE_TOTAL,
        moneda: input.MonId,
        ctz: input.MonCotiz,
        ...(input.DocNro ? { tipoDocRec: 80 as number } : {}), // si luego quieres mapear doc tipo, lo agregamos
        ...(input.DocNro ? { nroDocRec: maybeToNumber(input.DocNro) } : {}),
        tipoCodAut: input.TipoCodAut,
        codAut: Number(input.CAE_NUMBER),
      };

      // Valida contra QRDataSchema por seguridad
      const validatedQR = QRDataSchema.parse(qrPayload);
      const qrDataUrl = await generateQRCode(validatedQR);

      // 4) Reemplazos de placeholders
      const replacements: Record<string, string> = {
        "{{CbteTipo}}": String(input.CbteTipo),
        "{{NOMBRE_EMISOR}}": input.NOMBRE_EMISOR,
        "{{CUIT_EMISOR}}": input.CUIT_EMISOR,
        "{{DIRECCION_EMISOR}}": input.DIRECCION_EMISOR,
        "{{CondicionIVAEmisor}}": input.CondicionIVAEmisor,
        "{{INGRESOS_BRUTOS}}": input.INGRESOS_BRUTOS ?? "",
        "{{FECHA_INICIO_ACTIVIDADES}}": input.FECHA_INICIO_ACTIVIDADES
          ? formatDateDDMMYYYY(input.FECHA_INICIO_ACTIVIDADES)
          : "",
        "{{PtoVta}}": input.PtoVta.toString().padStart(5, "0"),
        "{{CbteNro}}": input.CbteNro.toString().padStart(8, "0"),
        "{{CbteFch}}": formatDateDDMMYYYY(input.CbteFch),
        "{{DocNro}}": input.DocNro ? String(input.DocNro) : "",
        "{{NOMBRE_RECEPTOR}}": input.NOMBRE_RECEPTOR,
        "{{CondicionIVAReceptor}}": input.CondicionIVAReceptor,
        "{{DIRECCION_RECEPTOR}}": input.DIRECCION_RECEPTOR ?? "",
        "{{CONDICION_PAGO}}": input.CONDICION_PAGO ?? "",
        "{{FchServDesde}}": input.FchServDesde
          ? formatDateDDMMYYYY(input.FchServDesde)
          : "",
        "{{FchServHasta}}": input.FchServHasta
          ? formatDateDDMMYYYY(input.FchServHasta)
          : "",
        "{{FchVtoPago}}": input.FchVtoPago
          ? formatDateDDMMYYYY(input.FchVtoPago)
          : "",
        "{{SUBTOTAL}}": formatAmountAR(input.SUBTOTAL),
        "{{IMPORTE_OTROS_TRIBUTOS}}": formatAmountAR(
          input.IMPORTE_OTROS_TRIBUTOS ?? 0
        ),
        "{{IMPORTE_TOTAL}}": formatAmountAR(input.IMPORTE_TOTAL),
        "{{CAE_NUMBER}}": String(input.CAE_NUMBER),
        "{{CAE_EXPIRY_DATE}}": formatDateDDMMYYYY(input.CAE_EXPIRY_DATE),
        "{{QR_CODE_DATA}}": qrDataUrl,
        "{{INVOICE_ITEMS}}": renderItems(input.INVOICE_ITEMS),
      };

      for (const [ph, val] of Object.entries(replacements)) {
        html = html.split(ph).join(val ?? "");
      }

      // 5) Retorno (solo HTML)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                phase: "html_only",
                message: "HTML de factura generado",
                html,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
