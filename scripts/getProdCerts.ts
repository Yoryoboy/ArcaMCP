import afip from "../src/services/afip/client.js";
import config from "../src/config.js";
import fs from "fs";
import path from "path";

const { CUIT } = config;

export interface CreateCertResponse {
  id: string;
  status: string;
  data: Data;
}

export interface Data {
  cert: string;
  key: string;
}

const data = {
  CUIT,
  username: CUIT,
  password: config.PASSWORD,
  alias: config.CERT_ALIAS,
};

try {
  // Ejecutamos la automatizacion
  const response: CreateCertResponse = await (afip as any).CreateAutomation(
    "create-cert-prod",
    data,
    true
  );

  // Validamos la respuesta
  if (!response || response.status !== "complete") {
    throw new Error(
      `La automatización no se completó correctamente. Estado: ${
        response?.status ?? "desconocido"
      }`
    );
  }

  if (!response.data?.cert || !response.data?.key) {
    throw new Error("La respuesta no contiene los campos 'cert' y 'key'.");
  }

  // Ruta base donde se ejecuta el script
  const baseDir = process.cwd();
  const targetDir = path.join(baseDir, "certs", "prod");

  // Creamos los directorios si no existen
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  } catch (dirErr) {
    throw new Error(
      `No se pudo crear el directorio de destino: ${targetDir}. Detalle: ${
        (dirErr as Error).message
      }`
    );
  }

  // Definimos rutas de archivos
  const certPath = path.join(targetDir, "prod_certificado.crt");
  const keyPath = path.join(targetDir, "prod_private.key");

  // Escribimos los archivos
  try {
    fs.writeFileSync(certPath, response.data.cert, { encoding: "utf-8" });
    fs.writeFileSync(keyPath, response.data.key, { encoding: "utf-8" });
  } catch (writeErr) {
    throw new Error(
      `Error al guardar los archivos de certificado/clave. Detalle: ${
        (writeErr as Error).message
      }`
    );
  }

  console.log(
    `Certificados guardados correctamente:\n- Certificado: ${certPath}\n- Clave privada: ${keyPath}`
  );
} catch (error) {
  console.error(error);
}
