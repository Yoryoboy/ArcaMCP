import afip from "../../services/afip/client.js";
import config from "../../config.js";
import { devEnvDetectedMessage } from "../../utils/helpers.js";
import { createCatalogTool } from "../catalogToolFactory.js";

export const GetSalesPointsTool = createCatalogTool({
  name: "get_sales_points",
  title: "Obtener puntos de venta disponibles",
  description:
    "Obtiene los puntos de venta disponibles para facturación electrónica. En testing siempre devuelve error ya que no existen puntos de venta configurados (se usa punto de venta 1 por defecto).",
  guard: () => {
    if (!config.AFIP_PRODUCTION) {
      return devEnvDetectedMessage(
        "Se ha detectado que se encuentra en ambiente de testing. En ambiente de testing es normal recibir error ya que no existen puntos de venta configurados. Se usa punto de venta 1 por defecto. Notificar al usuario acerca de esto y continuar con el punto de venta 1 por defecto.",
      );
    }

    return null;
  },
  fetcher: () => afip.ElectronicBilling.getSalesPoints(),
  onError: () => ({
    note: "En ambiente de testing es normal recibir error ya que no existen puntos de venta configurados. Se usa punto de venta 1 por defecto.",
  }),
});
