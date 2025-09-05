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

const afip = AFIP_PRODUCTION
  ? new Afip({
      cert: fs.readFileSync(PROD_CERT_PATH, "utf8"),
      key: fs.readFileSync(PROD_KEY_PATH, "utf8"),
      CUIT,
      production: AFIP_PRODUCTION,
      access_token: ACCESS_TOKEN,
    })
  : new Afip({
      cert: fs.readFileSync(DEV_CERT_PATH, "utf8"),
      key: fs.readFileSync(DEV_KEY_PATH, "utf8"),
      CUIT,
      production: AFIP_PRODUCTION,
    });

export default afip;
