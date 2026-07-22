import { MCPResponse } from "../../core/types.js";
import { generateQRCode } from "../../utils/qr/qr.js";
import { QRDataSchema } from "../../utils/qr/qr.schema.js";
import {
  CreatePDFInputBaseSchema,
  PublicRefinedSchema,
  ResolvedRefinedSchema,
} from "./CreatePDFTool.schemas.js";
import {
  findTemplate,
  buildQrPayload,
  buildReplacementMap,
  applyReplacements,
  buildFileName,
} from "./CreatePDFTool.helpers.js";
import afip from "../../services/afip/client.js";
import {
  configuredOwnerCuit,
  resolveOwnerProfile,
} from "../../services/afip/ownerTaxpayerProfile.js";

// ------------------------------
// Tool implementation: generate populated HTML and create PDF
// ------------------------------

export class CreatePDFTool {
  static readonly name = "create_pdf";

  static readonly metadata = {
    title: "Crear PDF de factura",
    description:
      "Genera un PDF dinámico de un comprobante electrónico combinando datos del voucher, emisor y receptor desde AFIP. La manera más recomendada de llenar la información para la factura de manera correcta es utilizar las herramientas apropiadas para recuperar los datos del CAE y los datos tanto del emisor como del receptor utilizando sus CUIT. El LLM no debe asumir ninguna información que no haya sido dada explícitamente o que no pueda inferir. Una vez todos los datos estén recopilados, se debe hacer un resumen de la factura tal cual como quedaría y mostrársela al usuario antes de proceder. Procederemos solo cuando tengamos la confirmación explícita del usuario. Nota importante: este tool usa dos campos relacionados al tipo de comprobante para evitar ambigüedad: CbteTipo (código numérico AFIP para uso técnico/QR) y CbteLetra (A/B/C/M) únicamente para la visualización en el PDF.",
    inputSchema: CreatePDFInputBaseSchema.shape,
  };

  static async execute(params: unknown): Promise<MCPResponse> {
    try {
      // 1) Validate and normalize input
      const publicInput = PublicRefinedSchema.parse(params);
      const ownerCuit = configuredOwnerCuit();
      const ownerProfile = await resolveOwnerProfile(ownerCuit);
      const input = ResolvedRefinedSchema.parse({ ...publicInput, ...ownerProfile });

      // 2) Read HTML template
      const html = findTemplate();

      // 3) Generate QR code
      const qrPayload = buildQrPayload(input);
      const validatedQR = QRDataSchema.parse(qrPayload);
      const qrDataUrl = await generateQRCode(validatedQR);

      // 4) Replace placeholders in template
      const replacements = buildReplacementMap(input, qrDataUrl);
      const populatedHtml = applyReplacements(html, replacements);

      // 5) Create PDF via AFIP SDK
      const fileName = buildFileName(input);
      const options = {
        width: 8,
        marginLeft: 0.4,
        marginRight: 0.4,
        marginTop: 0.4,
        marginBottom: 0.4,
      } as const;

      const res = await afip.ElectronicBilling.createPDF({
        html: populatedHtml,
        file_name: fileName,
        options,
      });

      // 6) Return success response
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                phase: "pdf_created",
                message: "PDF generado correctamente. El enlace expira en 24 horas.",
                file: res?.file,
                expiresInHours: 24,
              },
              null,
              2,
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
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  }
}
