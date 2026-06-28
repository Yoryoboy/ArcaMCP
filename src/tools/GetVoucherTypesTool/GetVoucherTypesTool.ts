import afip from "../../services/afip/client.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetVoucherTypesTool = createCatalogTool({
  name: "get_voucher_types",
  title: "Obtener tipos de comprobantes",
  description:
    "Obtiene los tipos de comprobantes disponibles en AFIP (Factura A, B, C, Nota de Crédito, etc.).",
  fetcher: () => afip.ElectronicBilling.getVoucherTypes(),
});
