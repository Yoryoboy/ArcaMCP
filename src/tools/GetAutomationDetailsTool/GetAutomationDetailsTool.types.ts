export interface MisComprobantes {
  id: string;
  status: string;
  data: Comprobante[];
}

interface Comprobante {
  "Fecha de Emisión": Date;
  "Tipo de Comprobante": string;
  "Punto de Venta": string;
  "Número Desde": string;
  "Número Hasta": string;
  "Cód. Autorización": string;
  "Tipo Doc. Receptor": string;
  "Nro. Doc. Receptor": string;
  "Denominación Receptor": string;
  "Tipo Cambio": string;
  Moneda: string;
  "Imp. Neto Gravado": string;
  "Imp. Neto No Gravado": string;
  "Imp. Op. Exentas": string;
  "Otros Tributos": string;
  IVA: string;
  "Imp. Total": string;
}
