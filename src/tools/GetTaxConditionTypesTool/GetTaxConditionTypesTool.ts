import afip from "../../services/afip/client.js";
import { AFIP_CATALOG_CACHE_TTL_MS, createCatalogTool } from "../catalogToolFactory.js";

export const GetTaxConditionTypesTool = createCatalogTool({
  name: "get_tax_condition_types",
  title: "Obtener tipos de condiciones IVA",
  description:
    "Obtiene los tipos de condiciones frente al IVA disponibles en AFIP (Responsable Inscripto, Monotributista, Exento, etc.).",
  cacheTtlMs: AFIP_CATALOG_CACHE_TTL_MS,
  fetcher: () =>
    afip.ElectronicBilling.executeRequest("FEParamGetCondicionIvaReceptor"),
});
