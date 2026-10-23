import Afip from "@afipsdk/afip.js";
import fs from "fs";
import path from "path";
import type { ConfigValues } from "../configValidation.js";
import { findConfigIssues } from "../configValidation.js";
import { writeEnvFile } from "./envFile.js";
import type { Prompter } from "./prompt.js";

export type SetupEnvironment = "dev" | "prod";

/** Web services every ArcaMCP tool depends on. */
export const REQUIRED_SERVICES = ["wsfe", "ws_sr_padron_a13"] as const;

interface AutomationClient {
  CreateAutomation(
    automation: string,
    params: Record<string, unknown>,
    wait?: boolean,
  ): Promise<{ id?: string; status?: string; data?: any }>;
}

export interface SetupDependencies {
  config: ConfigValues;
  cwd: string;
  prompter: Prompter;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  createClient?: (options: {
    CUIT: string;
    production: boolean;
    access_token: string;
  }) => AutomationClient;
}

export interface SetupOptions {
  environment?: SetupEnvironment;
  force?: boolean;
}

const defaultCreateClient: NonNullable<SetupDependencies["createClient"]> = (options) =>
  new Afip(options) as unknown as AutomationClient;

async function resolveValue(
  current: string | undefined,
  label: string,
  prompter: Prompter,
  hidden = false,
): Promise<string | undefined> {
  if (current?.trim()) {
    return current.trim();
  }
  if (!prompter.interactive) {
    return undefined;
  }
  return (await prompter.ask(`${label}: `, { hidden })) || undefined;
}

export function certificatePaths(cwd: string, environment: SetupEnvironment) {
  const directory = path.join(cwd, "certs", environment);
  return {
    directory,
    cert: path.join(directory, `${environment}_certificado.crt`),
    key: path.join(directory, `${environment}_private.key`),
  };
}

/**
 * Onboards a CUIT end to end: creates the certificate, stores it, records the
 * configuration in `.env` and authorizes the web services ArcaMCP uses.
 * Returns the process exit code.
 */
export async function runSetup(
  options: SetupOptions,
  dependencies: SetupDependencies,
): Promise<number> {
  const { config, cwd, prompter, stdout, stderr } = dependencies;
  const createClient = dependencies.createClient ?? defaultCreateClient;
  const environment = options.environment ?? (config.AFIP_PRODUCTION ? "prod" : "dev");
  const production = environment === "prod";
  const files = certificatePaths(cwd, environment);

  // Refuse before contacting ARCA: replacing a key silently would lock the user out.
  const existing = [files.cert, files.key].filter((file) => fs.existsSync(file));
  if (existing.length > 0 && !options.force) {
    stderr(
      `Ya existe ${existing.join(" y ")}. No se reemplazó nada. Usá --force para crear un certificado nuevo y reemplazarlo.\n`,
    );
    return 1;
  }

  stdout(`Configurando ArcaMCP para ${production ? "producción" : "homologación (dev)"}.\n`);

  const cuit = await resolveValue(config.CUIT, "CUIT (AFIP_CUIT)", prompter);
  const alias = await resolveValue(
    config.CERT_ALIAS,
    "Alias del certificado (AFIP_CERT_ALIAS)",
    prompter,
  );
  const accessToken = await resolveValue(
    config.ACCESS_TOKEN,
    "Access token de afipsdk.com (AFIP_SDK_ACCESS_TOKEN)",
    prompter,
    true,
  );
  const password = await resolveValue(
    config.PASSWORD,
    "Clave fiscal (AFIP_PASSWORD, no se guarda)",
    prompter,
    true,
  );

  const issues = findConfigIssues(
    { AFIP_PRODUCTION: production, CUIT: cuit, CERT_ALIAS: alias, ACCESS_TOKEN: accessToken },
    "automation",
  );
  if (!password) {
    issues.push("Falta AFIP_PASSWORD (clave fiscal).");
  }
  if (issues.length > 0) {
    stderr(
      `No se puede continuar:\n${issues.map((issue) => `- ${issue}`).join("\n")}\n` +
        "Definí las variables en .env o ejecutá setup en una terminal interactiva.\n",
    );
    return 1;
  }

  const client = createClient({ CUIT: cuit!, production, access_token: accessToken! });
  const credentials = { cuit: cuit!, username: cuit!, password: password!, alias: alias! };

  stdout(`Creando certificado (create-cert-${environment})...\n`);
  let certificate: { cert?: string; key?: string } | undefined;
  try {
    const response = await client.CreateAutomation(`create-cert-${environment}`, credentials, true);
    if (response?.status !== "complete" || !response.data?.cert || !response.data?.key) {
      stderr(
        `La automatización de certificado no se completó. Estado: ${response?.status ?? "desconocido"}.\n`,
      );
      return 1;
    }
    certificate = response.data;
  } catch (error) {
    stderr(`Falló la creación del certificado: ${(error as Error)?.message ?? error}\n`);
    return 1;
  }

  fs.mkdirSync(files.directory, { recursive: true });
  fs.writeFileSync(files.cert, certificate!.cert!, { mode: 0o644 });
  fs.writeFileSync(files.key, certificate!.key!, { mode: 0o600 });
  fs.chmodSync(files.key, 0o600);
  stdout(`Certificado guardado:\n- ${files.cert}\n- ${files.key}\n`);

  const variablePrefix = production ? "AFIP_PROD" : "AFIP_DEV";
  const envValues: Record<string, string> = {
    AFIP_CUIT: cuit!,
    AFIP_CERT_ALIAS: alias!,
    AFIP_SDK_ACCESS_TOKEN: accessToken!,
    [`${variablePrefix}_CERT_PATH`]: files.cert,
    [`${variablePrefix}_KEY_PATH`]: files.key,
  };
  const envPath = path.join(cwd, ".env");
  const envExisted = fs.existsSync(envPath);
  writeEnvFile(envPath, {
    ...envValues,
    // Never flip an environment the user already chose; only fill it in when absent.
    ...(envExisted && /^\s*(export\s+)?AFIP_PRODUCTION\s*=/m.test(fs.readFileSync(envPath, "utf8"))
      ? {}
      : { AFIP_PRODUCTION: String(production) }),
  });
  stdout(`${envExisted ? "Actualizado" : "Creado"} ${envPath} (la clave fiscal no se guarda).\n`);

  let failures = 0;
  for (const service of REQUIRED_SERVICES) {
    stdout(`Autorizando ${service} (auth-web-service-${environment})...\n`);
    try {
      const response = await client.CreateAutomation(
        `auth-web-service-${environment}`,
        { ...credentials, service },
        true,
      );
      if (response?.status === "complete" && response.data?.status === "created") {
        stdout(`- ${service}: autorizado.\n`);
        continue;
      }
      failures++;
      stderr(
        `- ${service}: no se pudo autorizar. Estado: ${response?.status ?? "desconocido"}, data.status: ${response?.data?.status ?? "desconocido"}.\n`,
      );
    } catch (error) {
      failures++;
      stderr(`- ${service}: falló la autorización: ${(error as Error)?.message ?? error}\n`);
    }
  }

  const clientConfig = {
    "arca-mcp": {
      command: "npx",
      args: ["-y", "@yoryoboy/arcamcp@latest"],
      env: { ...envValues, AFIP_PRODUCTION: String(production) },
    },
  };
  stdout("\nConfiguración para tu cliente MCP:\n" + `${JSON.stringify(clientConfig, null, 2)}\n`);

  if (failures > 0) {
    stderr(
      "Algunos servicios no se autorizaron. Autorizalos para este certificado desde el administrador de relaciones de ARCA y verificá con `arcamcp doctor`.\n",
    );
    return 1;
  }

  stdout("Listo. Verificá todo con `arcamcp doctor`.\n");
  return 0;
}
