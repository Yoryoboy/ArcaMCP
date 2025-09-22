import z from "zod";
import { GetLastVoucherSchema } from "./GetLastVoucherTool/GetLastVoucherTool.schemas.js";
import {
  ComprobantesAsociadosSchema,
  IvaItemSchema,
  OpcionalesItemSchema,
  TributoItemSchema,
  VoucherCoreSchema,
} from "./shared.schemas.js";
import { VoucherSchema } from "./CreateVoucherTool/CreateVoucherTool.schemas.js";
import { GetExchangeRateSchema } from "./GetExchangeRateTool/GetExchangeRateTool.schemas.js";
import { GetVoucherInfoSchema } from "./GetVoucherInfoTool/GetVoucherInfoTool.schemas.js";
import { GetTaxpayerDetailsSchema } from "./GetTaxpayerDetailsTool/GetTaxpayerDetailsTool.schemas.js";
import { GetCuitFromDniToolSchema } from "./GetCuitFromDniTool/GetCuitFromDniTool.schemas.js";
import { CreatePDFInputSchema } from "./CreatePDFTool/CreatePDFTool.schemas.js";

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

export type GetCuitFromDniToolParams = z.infer<typeof GetCuitFromDniToolSchema>;

// Expanded: PDF generation params now accept optional overrides and items
export type CreatePDFParams = z.infer<typeof CreatePDFInputSchema>;

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
