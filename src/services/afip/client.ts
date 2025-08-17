import Afip from "@afipsdk/afip.js";
import fs from "fs";
import config from "../../config";

const { CUIT, CERT_PATH, KEY_PATH } = config;

const afip = new Afip({
  cert: fs.readFileSync(CERT_PATH, "utf8"),
  key: fs.readFileSync(KEY_PATH, "utf8"),
  CUIT,
  production: false,
});

export default afip;
