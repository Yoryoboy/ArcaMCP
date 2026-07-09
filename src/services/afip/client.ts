import Afip from "@afipsdk/afip.js";
import fs from "fs";
import config from "../../config.js";

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

export function createAfipClient(
  options: AfipClientOptions,
  dependencies: AfipClientDependencies = {},
): AfipInstance {
  const { AfipConstructor = Afip } = dependencies;

  return new AfipConstructor(options) as AfipInstance;
}

export function loadAfipOptionsFromConfig(
  dependencies: AfipClientDependencies = {},
): AfipClientOptions {
  const { appConfig = config, fileSystem = fs } = dependencies;
  const certPath = appConfig.AFIP_PRODUCTION ? appConfig.PROD_CERT_PATH : appConfig.DEV_CERT_PATH;
  const keyPath = appConfig.AFIP_PRODUCTION ? appConfig.PROD_KEY_PATH : appConfig.DEV_KEY_PATH;

  return {
    cert: fileSystem.readFileSync(certPath, "utf8"),
    key: fileSystem.readFileSync(keyPath, "utf8"),
    CUIT: appConfig.CUIT,
    production: appConfig.AFIP_PRODUCTION,
    access_token: appConfig.ACCESS_TOKEN,
  };
}

export function getDefaultAfipClient(dependencies: AfipClientDependencies = {}): AfipInstance {
  if (!defaultAfipClient) {
    defaultAfipClient = createAfipClient(loadAfipOptionsFromConfig(dependencies), dependencies);
  }

  return defaultAfipClient;
}

const afip = getDefaultAfipClient();

export default afip;
