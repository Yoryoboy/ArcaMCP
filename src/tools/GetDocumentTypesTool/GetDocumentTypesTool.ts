import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetDocumentTypesTool = createCatalogTool({
  name: "get_document_types",
  title: "Obtener tipos de documentos",
  description:
    "Obtiene los tipos de documentos disponibles en AFIP (DNI, CUIT, CUIL, Pasaporte, etc.).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () => afip.ElectronicBilling.getDocumentTypes(),
});
