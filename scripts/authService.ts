import afip from "../src/services/afip/client.js";
import config from "../src/config.js";

const { CUIT } = config;

export interface AuthWebServiceResponse {
  id: string;
  status: string; // "complete" esperado
  data: {
    status: string; // "created" esperado
  };
}

// Leer argumento de línea de comandos: service
const serviceArg = process.argv[2];

if (!serviceArg || ["-h", "--help"].includes(serviceArg)) {
  console.log(
    "Uso: node authService <service>\n\n" +
      "Ejemplos:\n" +
      "  node authService wsfe\n" +
      "  node authService ws_sr_padron_a5\n\n" +
      "Nota: El script toma CUIT, PASSWORD y CERT_ALIAS desde la configuración (.env)."
  );
  process.exit(serviceArg ? 0 : 1);
}

const data = {
  cuit: CUIT,
  username: CUIT,
  password: config.PASSWORD,
  alias: config.CERT_ALIAS,
  service: serviceArg,
};

try {
  // Ejecutamos la automatización
  const response: AuthWebServiceResponse = await (afip as any).CreateAutomation(
    "auth-web-service-prod",
    data,
    true
  );

  // Validamos la respuesta
  if (!response || response.status !== "complete") {
    throw new Error(
      `La automatización no se completó correctamente. Estado: ${response?.status ?? "desconocido"}`
    );
  }

  if (!response.data || response.data.status !== "created") {
    throw new Error(
      `Respuesta inesperada. Se esperaba data.status = 'created', recibido: ${response.data?.status ?? "desconocido"}`
    );
  }

  console.log(
    `Autorización creada correctamente para el servicio '${serviceArg}'.`
  );
} catch (error) {
  console.error(error);
  process.exit(1);
}
