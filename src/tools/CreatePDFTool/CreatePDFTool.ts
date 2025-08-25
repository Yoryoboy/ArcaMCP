import { MCPResponse } from "../../core/types.js";
import { CreatePDFParams } from "../types.js";
import { CreatePDFSchema } from "./CreatePDFTool.schemas.js";
import afip from "../../services/afip/client.js";
import config from "../../config.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import { GenerateQRSchema } from "../GenerateQRTool/GenerateQRTool.schemas.js";
import type { InvoiceItem } from "../types.js";

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Helper functions (top-level to avoid 'this' context issues) ---
const getVoucherTypeName = (type: number): string => {
  const types: { [key: number]: string } = {
    1: "Factura A",
    2: "Nota de Débito A",
    3: "Nota de Crédito A",
    6: "Factura B",
    7: "Nota de Débito B",
    8: "Nota de Crédito B",
    11: "Factura C",
    12: "Nota de Débito C",
    13: "Nota de Crédito C",
  };
  return types[type] || `Tipo ${type}`;
};

const getVoucherTypeLetter = (type: number): string => {
  if ([1, 2, 3].includes(type)) return "A";
  if ([6, 7, 8].includes(type)) return "B";
  if ([11, 12, 13].includes(type)) return "C";
  return "";
};

const buildQRDataUrl = async (voucher: any, issuerCuit: string): Promise<string> => {
  try {
    const MonId = (voucher.MonId || "PES").toString().toUpperCase();
    const MonCotiz = MonId === "PES" ? 1 : voucher.MonCotiz || 1;
    const parsed = GenerateQRSchema.parse({
      Ver: 1,
      CbteFch: voucher.CbteFch,
      Cuit: issuerCuit,
      PtoVta: voucher.PtoVta,
      CbteTipo: voucher.CbteTipo,
      CbteNro: voucher.CbteNro,
      ImpTotal: voucher.ImpTotal,
      MonId,
      MonCotiz,
      DocTipo: voucher.DocTipo,
      DocNro: voucher.DocNro,
      TipoCodAut: "E",
      CodAut: voucher.CAE,
    });

    const formatDateISO = (yyyymmdd: string) =>
      `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;

    const payload: Record<string, any> = {
      ver: parsed.Ver ?? 1,
      fecha: formatDateISO(parsed.CbteFch),
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

    const base64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const qrText = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(base64)}`;
    const dataUrl = await QRCode.toDataURL(qrText, { errorCorrectionLevel: "M" });
    return dataUrl;
  } catch (e) {
    console.warn("No se pudo generar QR en memoria, usando placeholder.", e);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  }
};

const generateInvoiceItems = (items: InvoiceItem[] | undefined, voucher: any): string => {
  const fmt = (n: number) =>
    n.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (Array.isArray(items) && items.length > 0) {
    return items
      .map((it, idx) => {
        const code = it.code ?? String(idx + 1).padStart(3, "0");
        const qty = it.quantity ?? 1;
        const unit = it.unit ?? "Unidad";
        const unitPrice = it.unitPrice ?? 0;
        const discPct = it.discountPercent ?? 0;
        const discAmt =
          it.discountAmount ?? (discPct > 0 ? qty * unitPrice * (discPct / 100) : 0);
        const subtotal = it.subtotal ?? qty * unitPrice - discAmt;
        return `
            <tr>
              <td>${code}</td>
              <td>${(it.description || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
              <td>${fmt(qty)}</td>
              <td>${unit}</td>
              <td>${fmt(unitPrice)}</td>
              <td>${fmt(discPct)}</td>
              <td>${fmt(discAmt)}</td>
              <td>${fmt(subtotal)}</td>
            </tr>
          `;
      })
      .join("");
  }
  // Fallback: una línea básica usando total del voucher
  const total = Number(voucher?.ImpTotal || 0);
  return `
      <tr>
        <td>001</td>
        <td>Servicios profesionales</td>
        <td>1,00</td>
        <td>Unidad</td>
        <td>${fmt(total)}</td>
        <td>0,00</td>
        <td>0,00</td>
        <td>${fmt(total)}</td>
      </tr>
    `;
};

export class CreatePDFTool {
  static readonly name = "create_pdf";

  static readonly metadata = {
    title: "Crear PDF de comprobante",
    description:
      "Genera un PDF dinámico de un comprobante electrónico combinando datos del voucher, emisor y receptor desde AFIP",
    inputSchema: CreatePDFSchema.shape,
  };

  static async execute(params: CreatePDFParams): Promise<MCPResponse> {
    try {
      // Validación y normalización de entrada
      const validated = CreatePDFSchema.parse(params);
      const {
        PtoVta,
        CbteTipo,
        CbteNro,
        fileName,
        issuer: issuerOverride,
        recipient: recipientOverride,
        service: serviceOverride,
        paymentCondition,
        items,
      } = validated as any;

      // 1. Obtener información del comprobante (manejo robusto de formas de respuesta)
      console.log(`Obteniendo información del comprobante ${CbteNro}...`);
      const voucherInfo = await afip.ElectronicBilling.getVoucherInfo(
        CbteNro,
        PtoVta,
        CbteTipo
      );

      if (!voucherInfo) {
        throw new Error("No se pudo obtener información del comprobante");
      }

      // AFIP SDK puede devolver distintos envoltorios:
      // - { FECompConsResp: { ResultGet: {...} } }
      // - { FECompConsResp: {...} }
      // - { ResultGet: {...} }
      // - { ...camposDelComprobante }
      let voucher: any = undefined as any;
      const raw: any = voucherInfo as any;
      if (raw?.FECompConsResp?.ResultGet) {
        voucher = raw.FECompConsResp.ResultGet;
      } else if (raw?.FECompConsResp) {
        voucher = raw.FECompConsResp;
      } else if (raw?.ResultGet) {
        voucher = raw.ResultGet;
      } else {
        voucher = raw;
      }

      if (!voucher) {
        throw new Error("Comprobante no encontrado");
      }

      // Normalización de campos para el resto del flujo
      // Asegurar identificadores básicos
      voucher.PtoVta = voucher.PtoVta ?? PtoVta;
      voucher.CbteTipo = voucher.CbteTipo ?? CbteTipo;
      voucher.CbteNro = voucher.CbteNro ?? voucher.CbteDesde ?? CbteNro;
      // Normalizar CAE y fecha de vencimiento de CAE
      voucher.CAE =
        voucher.CAE ??
        voucher.CodAutorizacion ??
        voucher.CodAut ??
        voucher.codAutorizacion;
      voucher.CAEFchVto =
        voucher.CAEFchVto ?? voucher.FchVto ?? voucher.caeFchVto;
      // Asegurar moneda/cotización
      voucher.MonId = (voucher.MonId ?? voucher.monId ?? "PES")
        .toString()
        .toUpperCase();
      voucher.MonCotiz = voucher.MonCotiz ?? voucher.ctz ?? 1;
      // Documento receptor (puede venir undefined para consumidor final)
      voucher.DocTipo = voucher.DocTipo ?? voucher.tipoDocRec ?? 99;
      voucher.DocNro = voucher.DocNro ?? voucher.nroDocRec ?? 0;

      // 2. Obtener datos del emisor (flexible con overrides y fallback en dev)
      const skipPadron =
        String(process.env.SKIP_PADRON || "") === "1" ||
        String(process.env.NODE_ENV || "").toLowerCase() === "development";
      const issuerCuitResolved = String(
        (issuerOverride as any)?.cuit ??
          process.env.AFIP_CUIT ??
          (config as any)?.CUIT ??
          "20111111112" // CUIT dummy para entornos de desarrollo
      );

      let issuerDetails: any = null;
      if (!skipPadron) {
        try {
          console.log(
            `Obteniendo datos del emisor CUIT: ${issuerCuitResolved}...`
          );
          issuerDetails = await afip.RegisterScopeThirteen.getTaxpayerDetails(
            parseInt(issuerCuitResolved)
          );
        } catch (e) {
          console.warn(
            `No se pudieron obtener datos del emisor desde AFIP (se usarán datos mock/override).`,
            e
          );
        }
      }

      // 3. Obtener datos del receptor
      let recipientDetails = null;
      const docNro = voucher.DocNro;
      const docTipo = voucher.DocTipo;

      if (!skipPadron && docNro && docNro !== 0 && docTipo !== 99) {
        // No es consumidor final
        try {
          console.log(
            `Obteniendo datos del receptor DocNro: ${docNro}, DocTipo: ${docTipo}...`
          );

          if (docTipo === 80) {
            // CUIT
            recipientDetails =
              await afip.RegisterScopeThirteen.getTaxpayerDetails(docNro);
          } else if (docTipo === 96) {
            // DNI
            const taxId = await afip.RegisterScopeThirteen.getTaxIDByDocument(
              docNro
            );
            if (taxId && taxId.idPersona) {
              recipientDetails =
                await afip.RegisterScopeThirteen.getTaxpayerDetails(
                  taxId.idPersona
                );
            }
          }
        } catch (error) {
          console.warn(`No se pudieron obtener datos del receptor: ${error}`);
        }
      }

      // 4. Leer template HTML (resolución robusta)
      const candidatePaths = [
        path.resolve(process.cwd(), "templates/bill.html"),
        path.resolve(__dirname, "../../../templates/bill.html"),
        path.resolve(__dirname, "../../templates/bill.html"),
      ];
      const foundTemplate = candidatePaths.find((p) => fs.existsSync(p));
      if (!foundTemplate) {
        throw new Error(
          "No se encontró la plantilla HTML 'templates/bill.html'. Asegúrese de que exista en la raíz del proyecto."
        );
      }
      let htmlTemplate = fs.readFileSync(foundTemplate, "utf8");

      // 5. Formatear fechas
      const formatDate = (dateStr: string) => {
        if (!dateStr || dateStr.length !== 8) return dateStr;
        return `${dateStr.substring(6, 8)}/${dateStr.substring(
          4,
          6
        )}/${dateStr.substring(0, 4)}`;
      };

      // 6. Preparar datos para reemplazar placeholders
      const formatDateAny = (s?: string) => {
        if (!s) return "";
        if (/^\d{8}$/.test(s))
          return `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return `${m[3]}/${m[2]}/${m[1]}`;
        return s;
      };

      const issuerNameFromAFIP =
        (issuerDetails as any)?.persona?.razonSocial ||
        `${(issuerDetails as any)?.persona?.nombre || ""} ${
          (issuerDetails as any)?.persona?.apellido || ""
        }`.trim() ||
        "Empresa no identificada";
      const issuerCompanyName =
        issuerOverride?.companyName || issuerNameFromAFIP;
      const issuerAddress =
        issuerOverride?.address ||
        (issuerDetails as any)?.persona?.domicilio?.[0]?.direccion ||
        "Dirección no disponible";
      const issuerTaxCondition = issuerOverride?.taxCondition || "No informado";
      const issuerGrossIncome = issuerOverride?.grossIncome || "";
      const issuerStartDateRaw =
        issuerOverride?.startDate ||
        (issuerDetails as any)?.persona?.fechaInicioActividades;
      const issuerStartDate = formatDateAny(issuerStartDateRaw);

      const recipientNameFromAFIP =
        (recipientDetails as any)?.persona?.razonSocial ||
        `${(recipientDetails as any)?.persona?.nombre || ""} ${
          (recipientDetails as any)?.persona?.apellido || ""
        }`.trim() ||
        (docTipo === 99 ? "Consumidor Final" : "Cliente no identificado");
      const recipientName = recipientOverride?.name || recipientNameFromAFIP;
      const recipientAddress =
        recipientOverride?.address ||
        (recipientDetails as any)?.persona?.domicilio?.[0]?.direccion ||
        (docTipo === 99 ? "" : "Dirección no disponible");
      const recipientTaxCondition =
        recipientOverride?.taxCondition ||
        (docTipo === 99 ? "Consumidor Final" : "No informado");
      const recipientDoc =
        recipientOverride?.cuit ??
        (docNro && docNro !== 0 ? docNro.toString() : "");

      // Formatear montos
      const formatAmount = (amount: number) => {
        return amount.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
      };

      // 7. Generar QR en memoria y los ítems dinámicos
      const qrDataUrl = await buildQRDataUrl(
        voucher,
        String(issuerCuitResolved)
      );
      const itemsHtml = generateInvoiceItems(
        items as InvoiceItem[] | undefined,
        voucher
      );

      // Subtotal por ítems si se brindaron
      let computedItemsSubtotal = 0;
      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          const qty = it.quantity ?? 1;
          const unitPrice = it.unitPrice ?? 0;
          const discPct = it.discountPercent ?? 0;
          const discAmt =
            it.discountAmount ??
            (discPct > 0 ? qty * unitPrice * (discPct / 100) : 0);
          const sub = it.subtotal ?? qty * unitPrice - discAmt;
          computedItemsSubtotal += sub;
        }
      }

      // 8. Reemplazar placeholders en el HTML (usando split/join para evitar regex)
      const replacements: Record<string, string> = {
        "{{VOUCHER_TYPE_LETTER}}": getVoucherTypeLetter(CbteTipo),
        "{{ISSUER_COMPANY_NAME}}": String(issuerCompanyName),
        "{{ISSUER_CUIT}}": String(issuerCuitResolved),
        "{{ISSUER_ADDRESS}}": String(issuerAddress),
        "{{ISSUER_TAX_CONDITION}}": String(issuerTaxCondition),
        "{{ISSUER_GROSS_INCOME}}": String(issuerGrossIncome || ""),
        "{{ISSUER_START_DATE}}": String(issuerStartDate || ""),
        "{{POINT_OF_SALE}}": PtoVta.toString().padStart(5, "0"),
        "{{VOUCHER_NUMBER}}": CbteNro.toString().padStart(8, "0"),
        "{{ISSUE_DATE}}": formatDate(voucher.CbteFch || ""),
        "{{RECIPIENT_CUIT}}": String(recipientDoc || ""),
        "{{RECIPIENT_NAME}}": String(recipientName),
        "{{RECIPIENT_TAX_CONDITION}}": String(recipientTaxCondition),
        "{{RECIPIENT_ADDRESS}}": String(recipientAddress),
        "{{PAYMENT_CONDITION}}": String(paymentCondition || ""),
        "{{SERVICE_DATE_FROM}}": String(
          serviceOverride?.dateFrom ||
            (voucher.FchServDesde ? formatDate(voucher.FchServDesde) : "")
        ),
        "{{SERVICE_DATE_TO}}": String(
          serviceOverride?.dateTo ||
            (voucher.FchServHasta ? formatDate(voucher.FchServHasta) : "")
        ),
        "{{PAYMENT_DUE_DATE}}": String(
          serviceOverride?.paymentDueDate ||
            (voucher.FchVtoPago ? formatDate(voucher.FchVtoPago) : "")
        ),
        "{{SUBTOTAL}}": formatAmount(
          (computedItemsSubtotal || 0) > 0
            ? computedItemsSubtotal
            : voucher.ImpNeto || 0
        ),
        "{{OTHER_TAXES}}": formatAmount(voucher.ImpTrib || 0),
        "{{TOTAL_AMOUNT}}": formatAmount(voucher.ImpTotal || 0),
        "{{CAE_NUMBER}}": voucher.CAE || "",
        "{{CAE_EXPIRY_DATE}}": formatDate(voucher.CAEFchVto || ""),
        "{{QR_CODE_DATA}}": qrDataUrl,
        "{{INVOICE_ITEMS}}": itemsHtml,
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        htmlTemplate = htmlTemplate.split(placeholder).join(value ?? "");
      }

      // 8. Generar PDF
      const pdfFileName =
        fileName || `factura_${PtoVta}_${CbteNro}_${Date.now()}.pdf`;

      console.log(`Generando PDF: ${pdfFileName}...`);
      const pdfResult = await afip.ElectronicBilling.createPDF({
        html: htmlTemplate,
        file_name: pdfFileName,
        options: {
          format: "A4",
          margin: {
            top: "1cm",
            right: "1cm",
            bottom: "1cm",
            left: "1cm",
          },
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                message: "PDF generado exitosamente",
                fileName: pdfFileName,
                pdfUrl:
                  (pdfResult as any).file_url ||
                  (pdfResult as any).url ||
                  pdfResult.file,
                expiresInHours: 24,
                voucherInfo: {
                  type: getVoucherTypeName(CbteTipo),
                  number: CbteNro,
                  salesPoint: PtoVta,
                  total: voucher.ImpTotal,
                  cae: voucher.CAE,
                  caeExpiry: formatDate(voucher.CAEFchVto || ""),
                },
                issuer: {
                  name: issuerCompanyName,
                  cuit: String(issuerCuitResolved),
                },
                recipient: {
                  name: recipientName,
                  document: String(recipientDoc || "N/A"),
                },
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
                error:
                  error instanceof Error ? error.message : "Error desconocido",
                details: error,
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

  private static getVoucherTypeName(type: number): string {
    const types: { [key: number]: string } = {
      1: "Factura A",
      2: "Nota de Débito A",
      3: "Nota de Crédito A",
      6: "Factura B",
      7: "Nota de Débito B",
      8: "Nota de Crédito B",
      11: "Factura C",
      12: "Nota de Débito C",
      13: "Nota de Crédito C",
    };
    return types[type] || `Tipo ${type}`;
  }

  private static getVoucherTypeLetter(type: number): string {
    if ([1, 2, 3].includes(type)) return "A";
    if ([6, 7, 8].includes(type)) return "B";
    if ([11, 12, 13].includes(type)) return "C";
    return "";
  }

  private static async buildQRDataUrl(
    voucher: any,
    issuerCuit: string
  ): Promise<string> {
    try {
      const MonId = (voucher.MonId || "PES").toString().toUpperCase();
      const MonCotiz = MonId === "PES" ? 1 : voucher.MonCotiz || 1;
      const parsed = GenerateQRSchema.parse({
        Ver: 1,
        CbteFch: voucher.CbteFch,
        Cuit: issuerCuit,
        PtoVta: voucher.PtoVta,
        CbteTipo: voucher.CbteTipo,
        CbteNro: voucher.CbteNro,
        ImpTotal: voucher.ImpTotal,
        MonId,
        MonCotiz,
        DocTipo: voucher.DocTipo,
        DocNro: voucher.DocNro,
        TipoCodAut: "E",
        CodAut: voucher.CAE,
      });

      const formatDateISO = (yyyymmdd: string) =>
        `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(
          6,
          8
        )}`;

      const payload: Record<string, any> = {
        ver: parsed.Ver ?? 1,
        fecha: formatDateISO(parsed.CbteFch),
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

      const base64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
        "base64"
      );
      const qrText = `https://www.afip.gob.ar/fe/qr/?p=${encodeURIComponent(
        base64
      )}`;
      const dataUrl = await QRCode.toDataURL(qrText, {
        errorCorrectionLevel: "M",
      });
      return dataUrl;
    } catch (e) {
      console.warn("No se pudo generar QR en memoria, usando placeholder.", e);
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    }
  }

  private static generateInvoiceItems(
    items: InvoiceItem[] | undefined,
    voucher: any
  ): string {
    const fmt = (n: number) =>
      n.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    if (Array.isArray(items) && items.length > 0) {
      return items
        .map((it, idx) => {
          const code = it.code ?? String(idx + 1).padStart(3, "0");
          const qty = it.quantity ?? 1;
          const unit = it.unit ?? "Unidad";
          const unitPrice = it.unitPrice ?? 0;
          const discPct = it.discountPercent ?? 0;
          const discAmt =
            it.discountAmount ??
            (discPct > 0 ? qty * unitPrice * (discPct / 100) : 0);
          const subtotal = it.subtotal ?? qty * unitPrice - discAmt;
          return `
            <tr>
              <td>${code}</td>
              <td>${(it.description || "")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</td>
              <td>${fmt(qty)}</td>
              <td>${unit}</td>
              <td>${fmt(unitPrice)}</td>
              <td>${fmt(discPct)}</td>
              <td>${fmt(discAmt)}</td>
              <td>${fmt(subtotal)}</td>
            </tr>
          `;
        })
        .join("");
    }
    // Fallback: una línea básica usando total del voucher
    const total = Number(voucher?.ImpTotal || 0);
    return `
      <tr>
        <td>001</td>
        <td>Servicios profesionales</td>
        <td>1,00</td>
        <td>Unidad</td>
        <td>${fmt(total)}</td>
        <td>0,00</td>
        <td>0,00</td>
        <td>${fmt(total)}</td>
      </tr>
    `;
  }
}
