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
import afip from "../../services/afip/client.js";

// ------------------------------
// Tool implementation: generate populated HTML and create PDF
// ------------------------------

export class CreatePDFTool {
  static readonly name = "create_pdf";

  static readonly metadata = {
    title: "Crear PDF de factura",
    description:
      "Genera un PDF dinámico de un comprobante electrónico combinando datos del voucher, emisor y receptor desde AFIP. La manera más recomendada de llenar la información para la factura de manera correcta es utilizar las herramientas apropiadas para recuperar los datos del CAE y los datos tanto del emisor como del receptor utilizando sus CUIT. El LLM no debe asumir ninguna información que no haya sido dada explícitamente o que no pueda inferir. Una vez todos los datos estén recopilados, se debe hacer un resumen de la factura tal cual como quedaría y mostrársela al usuario antes de proceder. Procederemos solo cuando tengamos la confirmación explícita del usuario.",
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

      // 5) Crear PDF con AFIP SDK
      const fileName = `Factura_${input.CbteTipo}_${String(
        input.PtoVta
      ).padStart(5, "0")}_${String(input.CbteNro).padStart(8, "0")}`;

      const options = {
        width: 8, // pulgadas
        marginLeft: 0.4,
        marginRight: 0.4,
        marginTop: 0.4,
        marginBottom: 0.4,
      } as const;

      const res = await afip.ElectronicBilling.createPDF({
        html,
        file_name: fileName,
        options,
      });

      // 6) Retorno: URL del PDF y aviso de expiración 24h
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                phase: "pdf_created",
                message:
                  "PDF generado correctamente. El enlace expira en 24 horas.",
                file: res?.file,
                expiresInHours: 24,
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
