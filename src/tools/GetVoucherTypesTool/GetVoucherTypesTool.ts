import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetVoucherTypesTool = createCatalogTool({
  name: "get_voucher_types",
  title: "Obtener tipos de comprobantes",
  description:
    "Obtiene los tipos de comprobantes disponibles en AFIP (Factura A, B, C, Nota de Crédito, etc.).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getVoucherTypes(),
});
