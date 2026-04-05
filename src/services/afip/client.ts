import Afip from "@afipsdk/afip.js";
import fs from "fs";
import config from "../../config.js";

const {
  CUIT,
  DEV_CERT_PATH,
  DEV_KEY_PATH,
  AFIP_PRODUCTION,
  ACCESS_TOKEN,
  PROD_CERT_PATH,
  PROD_KEY_PATH,
} = config;

const afip = new Afip({
  cert: fs.readFileSync(AFIP_PRODUCTION ? PROD_CERT_PATH : DEV_CERT_PATH, "utf8"),
  key: fs.readFileSync(AFIP_PRODUCTION ? PROD_KEY_PATH : DEV_KEY_PATH, "utf8"),
  CUIT,
  production: AFIP_PRODUCTION,
  access_token: ACCESS_TOKEN,
});

export default afip;
