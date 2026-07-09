import afip from "../../services/afip/client.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetTaxConditionTypesTool = createCatalogTool({
  name: "get_tax_condition_types",
  title: "Obtener tipos de condiciones IVA",
  description:
    "Obtiene los tipos de condiciones frente al IVA disponibles en AFIP (Responsable Inscripto, Monotributista, Exento, etc.).",
  fetcher: () =>
    afip.ElectronicBilling.executeRequest("FEParamGetCondicionIvaReceptor"),
});
