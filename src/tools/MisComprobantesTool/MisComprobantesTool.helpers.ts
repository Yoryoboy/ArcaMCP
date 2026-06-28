import { MisComprobantesInputParams } from "./MisComprobantesTool.schemas.js";

type MisComprobantesCredentials = {
  CUIT: string;
  PASSWORD: string;
};

type MisComprobantesAutomationData = {
  cuit: string;
  username: string;
  password: string;
  filters?: Record<string, unknown>;
};

const buildDefinedEntries = (input: MisComprobantesInputParams) => {
  const filters: Record<string, unknown> = {};

  const entries: Array<[keyof MisComprobantesInputParams, unknown]> = [
    ["t", input.t],
    ["fechaEmision", input.fechaEmision],
    ["puntosVenta", input.puntosVenta],
    ["tiposComprobantes", input.tiposComprobantes],
    ["comprobanteDesde", input.comprobanteDesde],
    ["comprobanteHasta", input.comprobanteHasta],
    ["tipoDoc", input.tipoDoc],
    ["nroDoc", input.nroDoc],
    ["codigoAutorizacion", input.codigoAutorizacion],
  ];

  for (const [key, value] of entries) {
    if (value !== undefined) {
      filters[key] = value;
    }
  }

  return filters;
};

export const buildMisComprobantesFilters = (input: MisComprobantesInputParams) => {
  const filters = buildDefinedEntries(input);

  return Object.keys(filters).length > 0 ? filters : undefined;
};

export const buildMisComprobantesAutomationData = (
  input: MisComprobantesInputParams,
  credentials: MisComprobantesCredentials,
): MisComprobantesAutomationData => {
  const filters = buildMisComprobantesFilters(input);

  return {
    cuit: credentials.CUIT,
    username: credentials.CUIT,
    password: credentials.PASSWORD,
    ...(filters !== undefined ? { filters } : {}),
  };
};
