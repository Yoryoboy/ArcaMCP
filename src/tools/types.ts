// Tipos específicos de AFIP
export interface LastVoucherParams {
  puntoDeVenta: number;
  tipoDeComprobante: number;
}

export interface AFIPLastVoucherResponse {
  CbteNro: number;
  PtoVta: number;
  CbteTipo: number;
}
