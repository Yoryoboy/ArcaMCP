import afip from "../../services/afip/client.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetOptionsTypesTool = createCatalogTool({
  name: "get_options_types",
  title: "Obtener tipos de opciones",
  description:
    "Obtiene los tipos de opciones disponibles para los comprobantes en AFIP.",
  fetcher: () => afip.ElectronicBilling.getOptionsTypes(),
});
