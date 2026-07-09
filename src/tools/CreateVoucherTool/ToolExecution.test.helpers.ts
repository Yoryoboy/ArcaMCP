import { beforeEach, vi } from "vitest";

const mockStore = vi.hoisted(() => {
  const electronicBilling = {
    createVoucher: vi.fn(),
    createNextVoucher: vi.fn(),
    createPDF: vi.fn(),
    getSalesPoints: vi.fn(),
    getVoucherTypes: vi.fn(),
    getConceptTypes: vi.fn(),
    getDocumentTypes: vi.fn(),
    getAliquotTypes: vi.fn(),
    getCurrenciesTypes: vi.fn(),
    getOptionsTypes: vi.fn(),
    getTaxTypes: vi.fn(),
    getLastVoucher: vi.fn(),
    getVoucherInfo: vi.fn(),
    executeRequest: vi.fn(),
  };

  return {
    afip: {
      ElectronicBilling: electronicBilling,
      RegisterScopeThirteen: {
        getTaxpayerDetails: vi.fn(),
        getTaxIDByDocument: vi.fn(),
      },
      CreateAutomation: vi.fn(),
      GetAutomationDetails: vi.fn(),
    },
    config: {
      AFIP_PRODUCTION: true,
      CUIT: "20123456789",
      PASSWORD: "secret",
    },
    electronicBilling,
    findTemplate: vi.fn(),
    generateQRCode: vi.fn(),
  };
});

vi.mock("../../services/afip/client.js", () => ({
  default: mockStore.afip,
}));

vi.mock("../../config.js", () => ({
  default: mockStore.config,
}));

vi.mock("../../utils/qr/qr.js", () => ({
  generateQRCode: mockStore.generateQRCode,
}));

vi.mock("../CreatePDFTool/CreatePDFTool.helpers.js", async () => {
  const actual = await vi.importActual<typeof import("../CreatePDFTool/CreatePDFTool.helpers.js")>(
    "../CreatePDFTool/CreatePDFTool.helpers.js",
  );

  return { ...actual, findTemplate: mockStore.findTemplate };
});

export const getMocks = () => mockStore;

export const parseContent = (response: { content: Array<{ text: string }> }, index = 0) =>
  JSON.parse(response.content[index].text);

export const voucherCore = {
  PtoVta: 1,
  CbteTipo: 11,
  Concepto: 1,
  DocTipo: 99,
  CbteFch: "20260614",
  ImpTotal: 121,
  ImpTotConc: 0,
  ImpNeto: 100,
  ImpOpEx: 0,
  ImpIVA: 21,
  ImpTrib: 0,
  MonId: "PES",
  MonCotiz: 1,
  CondicionIVAReceptorId: 5,
};

export const voucherParams = {
  ...voucherCore,
  CantReg: 1,
  CbteDesde: 10,
  CbteHasta: 10,
};

export const pdfParams = {
  CbteTipo: 11,
  CbteLetra: "C" as const,
  NOMBRE_EMISOR: "Owner Name",
  CUIT_EMISOR: "20123456789",
  DIRECCION_EMISOR: "Owner Address",
  CondicionIVAEmisor: "Monotributo",
  PtoVta: 1,
  CbteNro: 123,
  CbteFch: "20260614",
  MonId: "PES",
  MonCotiz: 1,
  DocNro: "20304050607",
  NOMBRE_RECEPTOR: "Recipient Name",
  CondicionIVAReceptor: "Consumidor Final",
  SUBTOTAL: 100,
  IMPORTE_TOTAL: 100,
  CAE_NUMBER: "12345678901234",
  CAE_EXPIRY_DATE: "20260630",
  INVOICE_ITEMS: [{ descripcion: "Consulting", cantidad: 1, precioUnitario: 100, importe: 100 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStore.config.AFIP_PRODUCTION = true;
  mockStore.config.CUIT = "20123456789";
  mockStore.config.PASSWORD = "secret";
});
