import Afip from "@afipsdk/afip.js";
import fs from "fs";
import path from "path";
import { createPublicKey, X509Certificate } from "node:crypto";
import type { ConfigValues } from "../configValidation.js";
import { findConfigIssues } from "../configValidation.js";
import { createCertificateStatus } from "../services/certificate/certificateStatus.js";

export interface DoctorClientOptions {
  cert: string;
  key: string;
  CUIT: string;
  production: boolean;
  access_token: string;
}

/** The subset of the afipsdk client `doctor` needs. `doctor` never mutates anything. */
export interface DoctorAfipClient {
  ElectronicBilling: {
    getVoucherTypes(): Promise<unknown>;
    getSalesPoints(): Promise<unknown[]>;
  };
  RegisterScopeThirteen: {
    getTaxpayerDetails(identifier: number): Promise<unknown>;
  };
}

export interface DoctorDependencies {
  config: ConfigValues;
  cwd: string;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  createClient?: (options: DoctorClientOptions) => DoctorAfipClient;
  /** Injectable clock so certificate expiry can be exercised without waiting. */
  now?: () => number;
}

type LinePrefix = "✔" | "⚠" | "✖";

const NO_SALES_POINTS_MESSAGE =
  "No hay puntos de venta para Factura Electrónica: creá uno en el portal de ARCA y volvé a correr `arcamcp doctor`.";

const defaultCreateClient = (options: DoctorClientOptions): DoctorAfipClient =>
  new Afip(options) as unknown as DoctorAfipClient;

function errorMessage(error: unknown): string {
  const message = (error as { message?: unknown })?.message;
  return typeof message === "string" && message.trim() !== "" ? message : String(error);
}

/**
 * AFIP answers FEParamGetPtosVenta with an error instead of an empty list when the
 * account has no sales points, so that case is a warning rather than a failure.
 */
function isMissingSalesPoints(message: string): boolean {
  return (
    /puntos? de venta/i.test(message) && /\bno\b|\bning[uú]n|\bnot found\b|\bempty\b/i.test(message)
  );
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/**
 * Diagnoses an ArcaMCP configuration without modifying anything: no files are
 * written, no automation is created and no voucher is issued. Returns the exit
 * code: 0 when there is no `✖`, 1 otherwise.
 */
export async function runDoctor(dependencies: DoctorDependencies): Promise<number> {
  const { config, cwd } = dependencies;
  const createClient = dependencies.createClient ?? defaultCreateClient;
  const now = dependencies.now ?? Date.now;
  const production = config.AFIP_PRODUCTION;
  let errors = 0;
  let warnings = 0;

  const write = (prefix: LinePrefix, text: string) => {
    if (prefix === "✖") {
      errors++;
    }
    if (prefix === "⚠") {
      warnings++;
    }
    dependencies.stdout(`${prefix} ${text}\n`);
  };

  // 1. Which environment is configured, and is there a .env to look at.
  const envPath = path.join(cwd, ".env");
  const envDetail = fs.existsSync(envPath) ? `encontrado en ${envPath}` : `no hay .env en ${cwd}`;
  write("✔", `Ambiente: ${production ? "producción" : "homologación (dev)"}. .env: ${envDetail}.`);

  // 2. Configuration: what the server needs, then what only setup needs.
  const serverIssues = findConfigIssues(config, "server");
  for (const issue of serverIssues) {
    write("✖", issue);
  }
  if (serverIssues.length === 0) {
    write("✔", "Configuración del server completa.");
  }

  // Skip variables already reported as server errors (e.g. AFIP_CUIT).
  const variableOf = (issue: string) => issue.match(/AFIP_[A-Z_]+/)?.[0];
  const reported = new Set(serverIssues.map(variableOf));
  const automationIssues = findConfigIssues(config, "automation").filter(
    (issue) => !reported.has(variableOf(issue)),
  );
  if (!config.PASSWORD?.trim()) {
    automationIssues.push("Falta AFIP_PASSWORD (clave fiscal).");
  }
  for (const issue of automationIssues) {
    write("⚠", `${issue} Solo se usa en \`arcamcp setup\`.`);
  }

  // 3. The certificate and key files of the active environment.
  const variablePrefix = production ? "AFIP_PROD" : "AFIP_DEV";
  const certVariable = `${variablePrefix}_CERT_PATH`;
  const keyVariable = `${variablePrefix}_KEY_PATH`;
  let certPem: string | undefined;
  let keyPem: string | undefined;

  if (serverIssues.length === 0) {
    const certPath = path.resolve(cwd, production ? config.PROD_CERT_PATH! : config.DEV_CERT_PATH!);
    const keyPath = path.resolve(cwd, production ? config.PROD_KEY_PATH! : config.DEV_KEY_PATH!);

    const readConfiguredFile = (filePath: string, variable: string): string | undefined => {
      try {
        return fs.readFileSync(filePath, "utf8");
      } catch (error) {
        const code = (error as { code?: unknown }).code;
        const reason = typeof code === "string" ? `: ${code}` : "";
        write("✖", `No se pudo leer ${variable} (${filePath})${reason}.`);
        return undefined;
      }
    };

    certPem = readConfiguredFile(certPath, certVariable);
    keyPem = readConfiguredFile(keyPath, keyVariable);
    if (certPem !== undefined && keyPem !== undefined) {
      // Paths are the user's own terminal, so printing them is safe and useful.
      write("✔", `Certificado y clave legibles: ${certPath} · ${keyPath}`);
    }
  }

  // 4. Certificate validity.
  let certificate: X509Certificate | undefined;
  if (certPem !== undefined) {
    try {
      certificate = new X509Certificate(certPem);
    } catch {
      write("✖", `El archivo ${certVariable} no es un certificado X.509 PEM válido.`);
    }
  }

  if (certificate !== undefined && certPem !== undefined) {
    try {
      const environment = production ? "production" : "development";
      const status = createCertificateStatus(certPem, environment).getStatus(now);

      switch (status.status) {
        case "valid":
          write(
            "✔",
            `Certificado válido hasta ${status.validUntil} (quedan ${status.daysRemaining} días).`,
          );
          break;
        case "expiring_soon":
          write(
            "⚠",
            `El certificado vence el ${status.validUntil} (quedan ${status.daysRemaining} días). Renovalo con \`arcamcp setup\`.`,
          );
          break;
        case "expired":
          write("✖", `El certificado venció el ${status.validUntil}.`);
          break;
        default:
          write(
            "✖",
            `El certificado todavía no es válido: empieza a regir el ${status.validFrom}.`,
          );
      }
    } catch (error) {
      write("✖", `No se pudo leer el vencimiento del certificado: ${errorMessage(error)}`);
    }
  }

  // 5. The private key must belong to the certificate.
  if (certificate !== undefined && keyPem !== undefined) {
    try {
      const certificateKey = certificate.publicKey.export({ type: "spki", format: "der" });
      const privateKey = createPublicKey(keyPem).export({ type: "spki", format: "der" });

      if (certificateKey.equals(privateKey)) {
        write("✔", "La clave privada corresponde al certificado.");
      } else {
        write("✖", "La clave privada no corresponde al certificado.");
      }
    } catch {
      write("✖", `No se pudo leer la clave privada indicada en ${keyVariable} como PEM.`);
    }
  }

  // 6. Remote checks, only when the local configuration is sound.
  const credentials =
    errors === 0 && certPem !== undefined && keyPem !== undefined
      ? { cert: certPem, key: keyPem }
      : undefined;

  const checkRemoteServices = async (cert: string, key: string): Promise<void> => {
    let client: DoctorAfipClient;
    try {
      client = createClient({
        cert,
        key,
        CUIT: config.CUIT ?? "",
        production,
        access_token: config.ACCESS_TOKEN ?? "",
      });
    } catch (error) {
      write("✖", `No se pudo crear el cliente de AFIP: ${errorMessage(error)}`);
      return;
    }

    try {
      await client.ElectronicBilling.getVoucherTypes();
      write("✔", "wsfe autorizado.");
    } catch (error) {
      write("✖", `wsfe no autorizado: ${errorMessage(error)}`);
    }

    if (!production) {
      // Homologación has no padrón A13 endpoint and always uses sales point 1.
      write(
        "⚠",
        "En homologación no se chequea el padrón A13 (el endpoint no funciona en testing).",
      );
      write("⚠", "En homologación se usa el punto de venta 1; no se chequean los puntos de venta.");
      return;
    }

    try {
      await client.RegisterScopeThirteen.getTaxpayerDetails(Number(config.CUIT));
      write("✔", "ws_sr_padron_a13 autorizado.");
    } catch (error) {
      write("✖", `ws_sr_padron_a13 no autorizado: ${errorMessage(error)}`);
    }

    try {
      const salesPoints = await client.ElectronicBilling.getSalesPoints();
      const count = Array.isArray(salesPoints) ? salesPoints.length : 0;
      if (count > 0) {
        write("✔", `Puntos de venta: ${count} ${plural(count, "disponible", "disponibles")}.`);
      } else {
        write("⚠", NO_SALES_POINTS_MESSAGE);
      }
    } catch (error) {
      const message = errorMessage(error);
      if (isMissingSalesPoints(message)) {
        write("⚠", NO_SALES_POINTS_MESSAGE);
      } else {
        write("✖", `No se pudieron obtener los puntos de venta: ${message}`);
      }
    }
  };

  if (credentials === undefined) {
    write("⚠", "No se chequean los servicios remotos porque hay errores arriba.");
  } else {
    await checkRemoteServices(credentials.cert, credentials.key);
  }

  // 7. Summary.
  const errorLabel = plural(errors, "error", "errores");
  const warningLabel = plural(warnings, "advertencia", "advertencias");
  dependencies.stdout(`Resumen: ${errors} ${errorLabel} y ${warnings} ${warningLabel}.\n`);

  if (errors > 0) {
    dependencies.stderr(
      "Sugerencia: si te faltan certificados o autorizaciones, ejecutá `arcamcp setup`.\n",
    );
  }

  return errors > 0 ? 1 : 0;
}
