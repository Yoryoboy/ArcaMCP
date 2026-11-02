import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetOptionsTypesTool = createCatalogTool({
  name: "get_options_types",
  title: "Obtener tipos de opciones",
  description:
    "Obtiene los tipos de opciones disponibles para los comprobantes en AFIP.",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getOptionsTypes(),
});
