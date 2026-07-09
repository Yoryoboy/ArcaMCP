import afip from "../../services/afip/client.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetAliquotTypesTool = createCatalogTool({
  name: "get_aliquot_types",
  title: "Obtener tipos de alícuotas",
  description:
    "Obtiene los tipos de alícuotas de IVA disponibles en AFIP (0%, 10.5%, 21%, 27%, etc.).",
  fetcher: () => afip.ElectronicBilling.getAliquotTypes(),
});
