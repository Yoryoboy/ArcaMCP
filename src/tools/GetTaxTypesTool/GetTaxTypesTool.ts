import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetTaxTypesTool = createCatalogTool({
  name: "get_tax_types",
  title: "Obtener tipos de tributos",
  description:
    "Obtiene los tipos de tributos disponibles en AFIP (IIBB, impuestos municipales, etc.).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getTaxTypes(),
});
