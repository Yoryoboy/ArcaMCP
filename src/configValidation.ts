import { z } from "zod";

/**
 * Raw configuration values as read from the environment. Kept separate from
 * `config.ts` so validation can run against any source (tests, CLI, server).
 */
export interface ConfigValues {
  CUIT?: string;
  PASSWORD?: string;
  CERT_ALIAS?: string;
  DEV_CERT_PATH?: string;
  DEV_KEY_PATH?: string;
  PROD_CERT_PATH?: string;
  PROD_KEY_PATH?: string;
  AFIP_PRODUCTION: boolean;
  ACCESS_TOKEN?: string;
}

/**
 * - "server": what the MCP server needs to talk to AFIP web services.
 * - "automation": what `arcamcp setup` needs to run afipsdk automations.
 */
export type ConfigPurpose = "server" | "automation";

export class ConfigurationError extends Error {
  readonly code = "CONFIGURATION_ERROR";

  constructor(readonly issues: string[]) {
    super(`ArcaMCP no está configurado correctamente: ${issues.join(" ")}`);
    this.name = "ConfigurationError";
  }
}

const required = (variable: string, detail = "") =>
  z
    .string({ required_error: `Falta ${variable}${detail}.` })
    .trim()
    .min(1, `Falta ${variable}${detail}.`);

const cuit = required("AFIP_CUIT").pipe(
  z.string().regex(/^\d{11}$/, "AFIP_CUIT debe tener exactamente 11 dígitos, sin guiones."),
);

function schemaFor(values: ConfigValues, purpose: ConfigPurpose) {
  if (purpose === "automation") {
    return z.object({
      CUIT: cuit,
      CERT_ALIAS: required("AFIP_CERT_ALIAS"),
      ACCESS_TOKEN: required(
        "AFIP_SDK_ACCESS_TOKEN",
        " (requerida para las automatizaciones de setup)",
      ),
    });
  }

  if (values.AFIP_PRODUCTION) {
    return z.object({
      CUIT: cuit,
      PROD_CERT_PATH: required("AFIP_PROD_CERT_PATH"),
      PROD_KEY_PATH: required("AFIP_PROD_KEY_PATH"),
      ACCESS_TOKEN: required("AFIP_SDK_ACCESS_TOKEN", " (requerida con AFIP_PRODUCTION=true)"),
    });
  }

  return z.object({
    CUIT: cuit,
    DEV_CERT_PATH: required("AFIP_DEV_CERT_PATH"),
    DEV_KEY_PATH: required("AFIP_DEV_KEY_PATH"),
  });
}

/** Returns one human-readable issue per invalid or missing variable, in declaration order. */
export function findConfigIssues(values: ConfigValues, purpose: ConfigPurpose): string[] {
  const result = schemaFor(values, purpose).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

export function assertConfig(values: ConfigValues, purpose: ConfigPurpose): void {
  const issues = findConfigIssues(values, purpose);
  if (issues.length > 0) {
    throw new ConfigurationError(issues);
  }
}
