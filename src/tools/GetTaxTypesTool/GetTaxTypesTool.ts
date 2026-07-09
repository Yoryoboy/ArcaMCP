import afip from "../../services/afip/client.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetTaxTypesTool = createCatalogTool({
  name: "get_tax_types",
  title: "Obtener tipos de tributos",
  description:
    "Obtiene los tipos de tributos disponibles en AFIP (IIBB, impuestos municipales, etc.).",
  fetcher: () => afip.ElectronicBilling.getTaxTypes(),
});
