// Tipos específicos de AFIP
export interface LastVoucherParams {
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
  DocNro: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch?: string;
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
  DocNro: number;
  CbteFch?: string;
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

export interface AFIPVoucherResponse {
  CAE: string;
  CAEFchVto: string;
  voucher_number?: number;
  Resultado?: string;
}
