import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetConceptTypesTool = createCatalogTool({
  name: "get_concept_types",
  title: "Obtener tipos de conceptos",
  description:
    "Obtiene los tipos de conceptos disponibles en AFIP (Productos, Servicios, Productos y Servicios).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getConceptTypes(),
});
