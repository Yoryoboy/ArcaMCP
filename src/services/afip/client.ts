import Afip from "@afipsdk/afip.js";
import fs from "fs";
import config from "../../config.js";
import { ConfigurationError, assertConfig } from "../../configValidation.js";
import {
  CertificateStatusMonitor,
  createCertificateStatus,
} from "../certificate/certificateStatus.js";

type AfipInstance = InstanceType<typeof Afip>;

type AppConfig = typeof config;
type FileReader = Pick<typeof fs, "readFileSync">;

export interface AfipClientOptions {
  cert: string;
  key: string;
  CUIT: string;
  production: boolean;
  access_token: string;
}

interface AfipClientDependencies {
  AfipConstructor?: typeof Afip;
  appConfig?: AppConfig;
  fileSystem?: FileReader;
}

let defaultAfipClient: AfipInstance | undefined;
let defaultCertificateStatus: CertificateStatusMonitor | undefined;

export function createAfipClient(
  options: AfipClientOptions,
  dependencies: AfipClientDependencies = {},
): AfipInstance {
  const { AfipConstructor = Afip } = dependencies;

  return new AfipConstructor(options) as AfipInstance;
}

function readConfiguredFile(fileSystem: FileReader, filePath: string, variable: string): string {
  try {
    return fileSystem.readFileSync(filePath, "utf8");
  } catch (error) {
    const code = (error as { code?: unknown })?.code;
    const reason = typeof code === "string" ? ` (${code})` : "";
    throw new ConfigurationError([`No se pudo leer el archivo indicado en ${variable}${reason}.`]);
  }
}

export function loadAfipOptionsFromConfig(
  dependencies: AfipClientDependencies = {},
): AfipClientOptions {
  const { appConfig = config, fileSystem = fs } = dependencies;
  assertConfig(appConfig, "server");

  const environment = appConfig.AFIP_PRODUCTION ? "PROD" : "DEV";
  const certPath = appConfig.AFIP_PRODUCTION ? appConfig.PROD_CERT_PATH : appConfig.DEV_CERT_PATH;
  const keyPath = appConfig.AFIP_PRODUCTION ? appConfig.PROD_KEY_PATH : appConfig.DEV_KEY_PATH;

  return {
    cert: readConfiguredFile(fileSystem, certPath, `AFIP_${environment}_CERT_PATH`),
    key: readConfiguredFile(fileSystem, keyPath, `AFIP_${environment}_KEY_PATH`),
    CUIT: appConfig.CUIT,
    production: appConfig.AFIP_PRODUCTION,
    access_token: appConfig.ACCESS_TOKEN,
  };
}

function loadCertificateStatus(options: AfipClientOptions): CertificateStatusMonitor {
  try {
    return createCertificateStatus(options.cert, options.production ? "production" : "development");
  } catch {
    const variable = options.production ? "AFIP_PROD_CERT_PATH" : "AFIP_DEV_CERT_PATH";
    throw new ConfigurationError([
      `El archivo indicado en ${variable} no es un certificado X.509 PEM válido.`,
    ]);
  }
}

/**
 * Builds the shared AFIP client on first use. A configuration problem throws a
 * `ConfigurationError` on every call instead of crashing the server at startup,
 * so tools can report it to the user.
 */
export function getDefaultAfipClient(dependencies: AfipClientDependencies = {}): AfipInstance {
  if (!defaultAfipClient) {
    const options = loadAfipOptionsFromConfig(dependencies);
    defaultCertificateStatus = loadCertificateStatus(options);
    defaultAfipClient = createAfipClient(options, dependencies);
  }

  return defaultAfipClient;
}

export function getDefaultCertificateStatus(): CertificateStatusMonitor {
  if (!defaultCertificateStatus) {
    getDefaultAfipClient();
  }

  return defaultCertificateStatus!;
}

// Lazy proxy: tools keep using `afip.ElectronicBilling...`, but the client (and
// its certificate files) is only loaded when a tool actually needs it.
const afip = new Proxy({} as AfipInstance, {
  get(_target, property) {
    const client = getDefaultAfipClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default afip;
