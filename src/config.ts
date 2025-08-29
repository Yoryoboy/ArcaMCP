import dotenv from "dotenv";
dotenv.config();

export default {
  CUIT: process.env.AFIP_CUIT!,
  PASSWORD: process.env.AFIP_PASSWORD!,
  CERT_ALIAS: process.env.AFIP_CERT_ALIAS!,
  CERT_PATH: process.env.AFIP_CERT_PATH!,
  KEY_PATH: process.env.AFIP_KEY_PATH!,
  AFIP_PRODUCTION: process.env.AFIP_PRODUCTION === "true",
};
