import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetCurrenciesTypesTool = createCatalogTool({
  name: "get_currencies_types",
  title: "Obtener tipos de monedas",
  description:
    "Obtiene los tipos de monedas disponibles en AFIP (ARS, USD, EUR, etc.).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getCurrenciesTypes(),
});
