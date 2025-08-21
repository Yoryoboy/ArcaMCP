// Tipos específicos de AFIP
export interface GetLastVoucherParams {
  PtoVta: number;
  CbteTipo: number;
}

export interface AFIPLastVoucherResponse {
  CbteNro: number;
  PtoVta: number;
  CbteTipo: number;
}

// Tipos para creación de comprobantes
export interface VoucherParams {
  CantReg: number;
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro?: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
  CondicionIVAReceptorId: number;
  FchServDesde?: string;
  FchServHasta?: string;
  FchVtoPago?: string;
  Iva?: IvaItem[];
  Tributos?: TributoItem[];
  CbtesAsoc?: ComprobantesAsociados[];
  Opcionales?: OpcionalesItem[];
}

export interface NextVoucherParams {
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro?: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
  CondicionIVAReceptorId: number;
  FchServDesde?: string;
  FchServHasta?: string;
  FchVtoPago?: string;
  Iva?: IvaItem[];
  Tributos?: TributoItem[];
  CbtesAsoc?: ComprobantesAsociados[];
  Opcionales?: OpcionalesItem[];
}

export interface IvaItem {
  Id: number;
  BaseImp: number;
  Importe: number;
}

export interface TributoItem {
  Id: number;
  Desc?: string;
  BaseImp: number;
  Alic: number;
  Importe: number;
}

export interface ComprobantesAsociados {
  Tipo: number;
  PtoVta: number;
  Nro: number;
  Cuit?: string;
}

export interface OpcionalesItem {
  Id: string;
  Valor: string;
}

export interface GetExchangeRateParams {
  MonId: string;
  FchCotiz: string;
}

export interface GetVoucherInfoParams {
  CbteNro: number;
  PtoVta: number;
  CbteTipo: number;
}

export interface GetTaxpayerDetailsParams {
  taxId: number;
}

export interface GetTaxIDByDocumentParams {
  nationalId: number;
}

export interface CreatePDFParams {
  PtoVta: number;
  CbteTipo: number;
  CbteNro: number;
  fileName?: string;
}

export interface GetInvoicesInDateRangeParams {
  PtoVta: number;
  CbteTipo: number;
  fechaDesde: string;
  fechaHasta: string;
  batchSize?: number;
  includeDetails?: boolean;
  maxVouchers?: number;
}

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

export interface AFIPVoucherResponse {
  CAE: string;
  CAEFchVto: string;
  voucher_number?: number;
  Resultado?: string;
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
