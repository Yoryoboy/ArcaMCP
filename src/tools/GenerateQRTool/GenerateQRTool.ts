import { MCPResponse } from "../../core/types.js";
import QRCode from "qrcode";
import {
  GenerateQRSchema,
  GenerateQRInputSchema,
} from "./GenerateQRTool.schemas.js";
import type {
  AFIPQRPayload,
  GenerateQRParams,
  GenerateQRResult,
} from "../types.js";

/**
 * GenerateQRTool
 *
 * Genera el texto para el Código QR de AFIP a partir de los campos definidos en la especificación oficial.
 * - Valida los parámetros con Zod (ver `GenerateQRTool.schemas.ts`).
 * - Construye el payload JSON y lo codifica en Base64 dentro del parámetro `p` del URL oficial.
 * - Utiliza el paquete `qrcode` para generar el QR (por ahora se descarta la imagen y solo se retorna el texto y el payload).
 *
 * Referencias (AFIP):
 * - Código QR: https://www.afip.gob.ar/fe/qr/
 * - Especificaciones PDF: https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
 */
export class GenerateQRTool {
  static readonly name = "generate_qr";

  static readonly metadata = {
    title: "Generar Código QR AFIP",
    description:
      "Genera el payload y texto del Código QR para comprobantes electrónicos según especificaciones AFIP. Retorna el texto a codificar y el JSON utilizado.",
    inputSchema: GenerateQRInputSchema.shape,
  };

  /**
   * Ejecuta la generación del texto del QR y retorna el payload.
   */
  static async execute(params: GenerateQRParams): Promise<MCPResponse> {
    try {
      // 1) Validación de entrada con Zod (incluye normalizaciones/conversiones seguras)
      const parsed = GenerateQRSchema.parse(params);

      // 2) Mapear a payload tipado (garantizado por Zod)
      const formatDate = (yyyymmdd: string) =>
        `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(
          6,
          8
        )}`;
      const payload: AFIPQRPayload = {
        ver: parsed.Ver ?? 1,
        fecha: formatDate(parsed.CbteFch),
        cuit: parsed.Cuit,
        ptoVta: parsed.PtoVta,
        tipoCmp: parsed.CbteTipo,
        nroCmp: parsed.CbteNro,
        importe: parsed.ImpTotal,
        moneda: parsed.MonId,
        ctz: parsed.MonCotiz,
        ...(parsed.DocTipo !== undefined && parsed.DocNro !== undefined
          ? { tipoDocRec: parsed.DocTipo, nroDocRec: parsed.DocNro }
          : {}),
        tipoCodAut: parsed.TipoCodAut,
        codAut: String(parsed.CodAut),
      };

      // 3) Construir el texto del QR (URL oficial + JSON base64 en p)
      const json = JSON.stringify(payload);
      const base64 = Buffer.from(json, "utf8").toString("base64");
      const qrText = `https://www.arca.gob.ar/fe/qr/?p=${encodeURIComponent(
        base64
      )}`;

      // 4) Generar el QR con la librería 'qrcode'.
      //    Nota: Por ahora no retornamos la imagen, pero igual lo generamos para validar que el texto es correcto.
      //    Se podría retornar un DataURL o SVG si se solicita en el futuro.
      try {
        await QRCode.toString(qrText, {
          type: "svg",
          errorCorrectionLevel: "M",
        });
      } catch (qrErr) {
        // Si falla la generación de imagen, no interrumpe el flujo principal, solo se loguea.
        console.warn("Advertencia: no se pudo generar el SVG del QR:", qrErr);
      }

      const result: GenerateQRResult = { qrText, payload };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: "QR generado correctamente",
                ...result,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error: any) {
      // Manejo de errores con mensajes claros
      const isZodError = !!error?.issues;
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                error: isZodError
                  ? "Parámetros inválidos"
                  : error?.message || "Error generando QR",
                details: isZodError ? error.issues : error,
                hint: "Verifique que los campos coincidan con las especificaciones AFIP. Principales: Ver, CbteFch (yyyyMMdd), Cuit (11 dígitos), PtoVta, CbteTipo, CbteNro, ImpTotal, MonId (3 letras), MonCotiz (>0), TipoCodAut (E/A), CodAut (14 dígitos). Opcionales: DocTipo/DocNro. También se aceptan alias: fecha, ptoVta, tipoCmp, nroCmp, importe, moneda, ctz, tipoDocRec, nroDocRec, tipoCodAut, codAut, cuit, ver.",
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
