import z from "zod";
import { GetLastVoucherSchema } from "./GetLastVoucherTool/GetLastVoucherTool.schemas";
import {
  ComprobantesAsociadosSchema,
  IvaItemSchema,
  OpcionalesItemSchema,
  TributoItemSchema,
  VoucherCoreSchema,
} from "./shared.schemas";
import { VoucherSchema } from "./CreateVoucherTool/CreateVoucherTool.schemas";
import { GetExchangeRateSchema } from "./GetExchangeRateTool/GetExchangeRateTool.schemas";
import { GetVoucherInfoSchema } from "./GetVoucherInfoTool/GetVoucherInfoTool.schemas";
import { GetTaxpayerDetailsSchema } from "./GetTaxpayerDetailsTool/GetTaxpayerDetailsTool.schemas";
import { GetTaxIDByDocumentSchema } from "./GetTaxIDByDocumentTool/GetTaxIDByDocumentTool.schemas";
import {
  CreatePDFSchema,
  InvoiceItemSchema,
} from "./CreatePDFTool/CreatePDFTool.schemas";
import { GetInvoicesInDateRangeSchema } from "./GetInvoicesInDateRangeTool/GetInvoicesInDateRangeTool.schemas";

export type GetLastVoucherParams = z.infer<typeof GetLastVoucherSchema>;

export interface AFIPLastVoucherResponse {
  CbteNro: number;
  PtoVta: number;
  CbteTipo: number;
}

export type NextVoucherParams = z.infer<typeof VoucherCoreSchema>;

// Tipos para creación de comprobantes
export type VoucherParams = z.infer<typeof VoucherSchema>;

export type IvaItem = z.infer<typeof IvaItemSchema>;

export type TributoItem = z.infer<typeof TributoItemSchema>;

export type ComprobantesAsociados = z.infer<typeof ComprobantesAsociadosSchema>;

export type OpcionalesItem = z.infer<typeof OpcionalesItemSchema>;

export type GetExchangeRateParams = z.infer<typeof GetExchangeRateSchema>;

export type GetVoucherInfoParams = z.infer<typeof GetVoucherInfoSchema>;

export type GetTaxpayerDetailsParams = z.infer<typeof GetTaxpayerDetailsSchema>;

export type GetTaxIDByDocumentParams = z.infer<typeof GetTaxIDByDocumentSchema>;

// New: Invoice item structure for dynamic PDF rows
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

// Expanded: PDF generation params now accept optional overrides and items
export type CreatePDFParams = z.infer<typeof CreatePDFSchema>;

export type GetInvoicesInDateRangeParams = z.infer<
  typeof GetInvoicesInDateRangeSchema
>;

export interface VoucherSummary {
  cbteNro: number;
  cbteFch: string;
  impTotal: number;
  cae: string;
  caeExpiry: string;
  docTipo?: number;
  docNro?: number;
}

export interface DateRangeResult {
  summary: {
    totalVouchers: number;
    totalAmount: number;
    dateRange: {
      from: string;
      to: string;
    };
    voucherRange: {
      first: number;
      last: number;
    };
  };
  vouchers: VoucherSummary[];
  performance: {
    totalQueries: number;
    binarySearchQueries: number;
    batchQueries: number;
    executionTimeMs: number;
  };
}

// Types specific to AFIP QR payload as per official specification
// Keeping a clear separation between types, schema, and tool logic.

export type AFIPQRPayload = {
  ver: 1; // spec version (fixed at 1)
  fecha: string; // YYYY-MM-DD
  cuit: number; // 11-digit CUIT of issuer
  ptoVta: number; // sales point
  tipoCmp: number; // voucher type (1,2,3,6,7,8,11,12,13, ...)
  nroCmp: number; // voucher number
  importe: number; // total amount
  moneda: string; // 3-letter currency code (PES, DOL, EUR, etc.)
  ctz: number; // currency exchange rate (1 if PES)
  tipoDocRec?: number; // receptor document type (80=CUIT, 96=DNI, 99=CF)
  nroDocRec?: number; // receptor document number
  tipoCodAut: "E" | "A"; // authorization code type (usually "E")
  codAut: string; // CAE (14 digits)
};

// Voucher-consistent input type with accepted QR-style aliases
export type GenerateQRParams = {
  // Voucher-consistent (preferred)
  Ver?: 1;
  CbteFch: string; // yyyyMMdd
  Cuit: number | string;
  PtoVta: number | string;
  CbteTipo: number | string;
  CbteNro: number | string;
  ImpTotal: number | string;
  MonId: string;
  MonCotiz: number | string;
  DocTipo?: number | string;
  DocNro?: number | string;
  TipoCodAut?: "E" | "A"; // default "E"
  CodAut: string | number; // 14 digits

  // Aliases (QR-style) accepted by schema preprocess for compatibility
  ver?: 1;
  fecha?: string; // YYYY-MM-DD or YYYYMMDD
  cuit?: number | string;
  ptoVta?: number | string;
  tipoCmp?: number | string;
  nroCmp?: number | string;
  importe?: number | string;
  moneda?: string;
  ctz?: number | string;
  tipoDocRec?: number | string;
  nroDocRec?: number | string;
  tipoCodAut?: "E" | "A";
  codAut?: string | number;
};

export type GenerateQRResult = {
  // The exact string that must be encoded in the QR image (AFIP URL with base64 JSON in `p`)
  qrText: string;
  // Raw payload that was encoded (useful for debugging or external validation)
  payload: AFIPQRPayload;
};
