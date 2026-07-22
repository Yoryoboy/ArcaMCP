import Afip from "@afipsdk/afip.js";
import config from "../src/config.js";
import fs from "fs";
import path from "path";

const { CUIT } = config;
const afip = new Afip({
  CUIT,
  production: true,
  access_token: config.ACCESS_TOKEN,
});

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

const response = (await afip.CreateAutomation(
  "create-cert-prod",
  data,
  true,
)) as CreateCertResponse;

if (!response || response.status !== "complete") {
  throw new Error(
    `Certificate automation did not complete successfully. Status: ${response?.status ?? "unknown"}`,
  );
}

if (!response.data?.cert || !response.data?.key) {
  throw new Error("Certificate automation response is missing 'cert' or 'key'.");
}

const targetDir = path.join(process.cwd(), "certs", "prod");

try {
  fs.mkdirSync(targetDir, { recursive: true });
} catch (error) {
  throw new Error(`Failed to create certificate directory: ${targetDir}`, { cause: error });
}

const certPath = path.join(targetDir, "prod_certificado.crt");
const keyPath = path.join(targetDir, "prod_private.key");

try {
  fs.writeFileSync(certPath, response.data.cert, { encoding: "utf-8" });
  fs.writeFileSync(keyPath, response.data.key, { encoding: "utf-8" });
} catch (error) {
  throw new Error("Failed to save production certificate files", { cause: error });
}

console.log(
  `Production certificates saved:\n- Certificate: ${certPath}\n- Private key: ${keyPath}`,
);
