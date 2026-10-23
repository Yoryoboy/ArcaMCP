import { describe, expect, it } from "vitest";
import { ConfigurationError, assertConfig, findConfigIssues } from "./configValidation.js";

const devConfig = {
  CUIT: "20123456789",
  PASSWORD: undefined,
  CERT_ALIAS: undefined,
  DEV_CERT_PATH: "./certs/dev/dev_certificado.crt",
  DEV_KEY_PATH: "./certs/dev/dev_private.key",
  PROD_CERT_PATH: undefined,
  PROD_KEY_PATH: undefined,
  AFIP_PRODUCTION: false,
  ACCESS_TOKEN: undefined,
};

describe("config validation", () => {
  it("accepts a development server config without password, alias or access token", () => {
    expect(findConfigIssues(devConfig, "server")).toEqual([]);
  });

  it("names every missing variable of the active environment", () => {
    expect(
      findConfigIssues(
        { ...devConfig, CUIT: undefined, DEV_CERT_PATH: "", DEV_KEY_PATH: undefined },
        "server",
      ),
    ).toEqual(["Falta AFIP_CUIT.", "Falta AFIP_DEV_CERT_PATH.", "Falta AFIP_DEV_KEY_PATH."]);
  });

  it("requires production paths and the SDK access token in production", () => {
    expect(findConfigIssues({ ...devConfig, AFIP_PRODUCTION: true }, "server")).toEqual([
      "Falta AFIP_PROD_CERT_PATH.",
      "Falta AFIP_PROD_KEY_PATH.",
      "Falta AFIP_SDK_ACCESS_TOKEN (requerida con AFIP_PRODUCTION=true).",
    ]);
  });

  it("rejects a CUIT that is not exactly 11 digits", () => {
    expect(findConfigIssues({ ...devConfig, CUIT: "20-12345678-9" }, "server")).toEqual([
      "AFIP_CUIT debe tener exactamente 11 dígitos, sin guiones.",
    ]);
  });

  it("requires alias and access token only for automations", () => {
    expect(findConfigIssues(devConfig, "automation")).toEqual([
      "Falta AFIP_CERT_ALIAS.",
      "Falta AFIP_SDK_ACCESS_TOKEN (requerida para las automatizaciones de setup).",
    ]);
  });

  it("throws a ConfigurationError carrying every issue", () => {
    let thrown: unknown;
    try {
      assertConfig({ ...devConfig, DEV_KEY_PATH: undefined }, "server");
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ConfigurationError);
    expect(thrown).toMatchObject({
      name: "ConfigurationError",
      code: "CONFIGURATION_ERROR",
      issues: ["Falta AFIP_DEV_KEY_PATH."],
      message: "ArcaMCP no está configurado correctamente: Falta AFIP_DEV_KEY_PATH.",
    });
  });
});
