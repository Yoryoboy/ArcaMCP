import dotenv from "dotenv";
dotenv.config();

export default {
  CUIT: process.env.AFIP_CUIT!,
  PASSWORD: process.env.AFIP_PASSWORD!,
  CERT_ALIAS: process.env.AFIP_CERT_ALIAS!,
  DEV_CERT_PATH: process.env.AFIP_DEV_CERT_PATH!,
  DEV_KEY_PATH: process.env.AFIP_DEV_KEY_PATH!,
  PROD_CERT_PATH: process.env.AFIP_PROD_CERT_PATH!,
  PROD_KEY_PATH: process.env.AFIP_PROD_KEY_PATH!,
  AFIP_PRODUCTION: process.env.AFIP_PRODUCTION === "true",
  ACCESS_TOKEN: process.env.AFIP_SDK_ACCESS_TOKEN!,
};
