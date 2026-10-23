import fs from "fs";
import os from "os";
import path from "path";
import { X509Certificate } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ConfigValues } from "../configValidation.js";
import type { DoctorDependencies } from "./doctor.js";
import { runDoctor } from "./doctor.js";
import {
  otherPrivateKey,
  testCertificate,
  testPrivateKey,
} from "./__fixtures__/testCertificates.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PASSWORD = "clave-fiscal-de-prueba";
const ACCESS_TOKEN = "token-afipsdk-de-prueba";

const tempDirectories: string[] = [];

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function productionConfig(overrides: Partial<ConfigValues> = {}): ConfigValues {
  return {
    CUIT: "20123456789",
    PASSWORD,
    CERT_ALIAS: "arcamcp-test",
    PROD_CERT_PATH: "./certs/prod/certificado.crt",
    PROD_KEY_PATH: "./certs/prod/clave.key",
    AFIP_PRODUCTION: true,
    ACCESS_TOKEN,
    ...overrides,
  };
}

function developmentConfig(overrides: Partial<ConfigValues> = {}): ConfigValues {
  return {
    CUIT: "20123456789",
    PASSWORD,
    CERT_ALIAS: "arcamcp-test",
    DEV_CERT_PATH: "./certs/dev/certificado.crt",
    DEV_KEY_PATH: "./certs/dev/clave.key",
    AFIP_PRODUCTION: false,
    ACCESS_TOKEN,
    ...overrides,
  };
}

function createFakeClient() {
  return {
    CreateAutomation: vi.fn(async () => {
      throw new Error("doctor no debe crear automatizaciones");
    }),
    ElectronicBilling: {
      getVoucherTypes: vi.fn(async () => [{ Id: 1, Desc: "Factura C" }]),
      getSalesPoints: vi.fn(async () => [{ Nro: 1 }, { Nro: 2 }]),
    },
    RegisterScopeThirteen: {
      getTaxpayerDetails: vi.fn(async () => ({ idPersona: 20123456789 })),
    },
  };
}

function writeCertificates(
  directory: string,
  environment: "prod" | "dev",
  contents: { cert?: string; key?: string } = {},
) {
  const base = path.join(directory, "certs", environment);
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, "certificado.crt"), contents.cert ?? testCertificate);
  fs.writeFileSync(path.join(base, "clave.key"), contents.key ?? testPrivateKey);
}

function createHarness(options: { config?: ConfigValues; now?: () => number } = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "arcamcp-doctor-"));
  tempDirectories.push(directory);
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const client = createFakeClient();
  const createClient = vi.fn(() => client);
  const dependencies: DoctorDependencies = {
    config: options.config ?? productionConfig(),
    cwd: directory,
    stdout: (text) => stdoutChunks.push(text),
    stderr: (text) => stderrChunks.push(text),
    createClient,
    ...(options.now ? { now: options.now } : {}),
  };

  return {
    directory,
    client,
    createClient: createClient as unknown as Mock,
    dependencies,
    run: (overrides: Partial<DoctorDependencies> = {}) =>
      runDoctor({ ...dependencies, ...overrides }),
    get stdout() {
      return stdoutChunks.join("");
    },
    get stderr() {
      return stderrChunks.join("");
    },
    get output() {
      return [...stdoutChunks, ...stderrChunks].join("");
    },
  };
}

describe("runDoctor", () => {
  it("reports a healthy production setup and runs the three remote checks", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.output).not.toContain("✖");
    expect(harness.stdout).toContain("✔ Ambiente: producción");
    expect(harness.stdout).toContain(`no hay .env en ${harness.directory}`);
    expect(harness.stdout).toContain("✔ Configuración del server completa.");
    expect(harness.stdout).toContain(
      `✔ Certificado y clave legibles: ${path.join(harness.directory, "certs/prod/certificado.crt")}`,
    );
    expect(harness.stdout).toContain("✔ Certificado válido hasta");
    expect(harness.stdout).toContain("✔ La clave privada corresponde al certificado.");
    expect(harness.stdout).toContain("✔ wsfe autorizado.");
    expect(harness.stdout).toContain("✔ ws_sr_padron_a13 autorizado.");
    expect(harness.stdout).toContain("✔ Puntos de venta: 2 disponibles.");
    expect(harness.stdout).toContain("Resumen: 0 errores y 0 advertencias.");
    expect(harness.createClient).toHaveBeenCalledTimes(1);
    expect(harness.createClient).toHaveBeenCalledWith({
      cert: testCertificate,
      key: testPrivateKey,
      CUIT: "20123456789",
      production: true,
      access_token: ACCESS_TOKEN,
    });
    expect(harness.client.ElectronicBilling.getVoucherTypes).toHaveBeenCalledTimes(1);
    expect(harness.client.RegisterScopeThirteen.getTaxpayerDetails).toHaveBeenCalledWith(
      20123456789,
    );
    expect(harness.client.ElectronicBilling.getSalesPoints).toHaveBeenCalledTimes(1);
  });

  it("tells the user when a .env file is present", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    fs.writeFileSync(path.join(harness.directory, ".env"), "AFIP_CUIT=20123456789\n");

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.stdout).toContain(`encontrado en ${path.join(harness.directory, ".env")}`);
  });

  it("lists every missing server variable without reading certificates or creating a client", async () => {
    const harness = createHarness({ config: { AFIP_PRODUCTION: true } });

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain("✖ Falta AFIP_CUIT.");
    expect(harness.stdout).toContain("✖ Falta AFIP_PROD_CERT_PATH.");
    expect(harness.stdout).toContain("✖ Falta AFIP_PROD_KEY_PATH.");
    expect(harness.stdout).toContain("✖ Falta AFIP_SDK_ACCESS_TOKEN");
    expect(harness.stdout.match(/✖/g)).toHaveLength(4);
    expect(harness.stdout).toContain("⚠ Falta AFIP_CERT_ALIAS. Solo se usa en `arcamcp setup`.");
    expect(harness.stdout).toContain("⚠ Falta AFIP_PASSWORD");
    // A variable already reported as an error is not repeated as a warning.
    expect(harness.stdout.match(/⚠/g)).toHaveLength(3);
    expect(harness.createClient).not.toHaveBeenCalled();
    // No file was read: neither the readable-files check nor a read error appeared.
    expect(harness.output).not.toContain("Certificado y clave legibles");
    expect(harness.output).not.toContain("No se pudo leer");
    expect(harness.stderr).toContain("`arcamcp setup`");
  });

  it("flags an unreadable certificate path with the variable name and the error code", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    fs.rmSync(path.join(harness.directory, "certs/prod/certificado.crt"));

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain("✖ No se pudo leer AFIP_PROD_CERT_PATH");
    expect(harness.stdout).toContain("ENOENT");
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("flags a file that is not a valid X.509 PEM certificate", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod", { cert: "esto no es un certificado" });

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain(
      "✖ El archivo AFIP_PROD_CERT_PATH no es un certificado X.509 PEM válido.",
    );
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("flags a private key that does not match the certificate and skips remote checks", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod", { key: otherPrivateKey });

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain("✖ La clave privada no corresponde al certificado.");
    expect(harness.stdout).toContain("⚠ No se chequean los servicios remotos");
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("flags an unparsable private key", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod", { key: "esto no es una clave" });

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain(
      "✖ No se pudo leer la clave privada indicada en AFIP_PROD_KEY_PATH",
    );
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("reports the wsfe authorization error and keeps checking the other services", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    harness.client.ElectronicBilling.getVoucherTypes.mockRejectedValueOnce(
      new Error("El web service wsfe no está autorizado para este CUIT"),
    );

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain(
      "✖ wsfe no autorizado: El web service wsfe no está autorizado para este CUIT",
    );
    expect(harness.client.RegisterScopeThirteen.getTaxpayerDetails).toHaveBeenCalledTimes(1);
    expect(harness.client.ElectronicBilling.getSalesPoints).toHaveBeenCalledTimes(1);
  });

  it("reports the padrón A13 authorization error in production", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    harness.client.RegisterScopeThirteen.getTaxpayerDetails.mockRejectedValueOnce(
      new Error("Computador no autorizado a acceder al servicio"),
    );

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain(
      "✖ ws_sr_padron_a13 no autorizado: Computador no autorizado a acceder al servicio",
    );
  });

  it("checks only wsfe in homologación and warns about A13 and sales points", async () => {
    const harness = createHarness({ config: developmentConfig() });
    writeCertificates(harness.directory, "dev");

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.output).not.toContain("✖");
    expect(harness.stdout).toContain("✔ Ambiente: homologación (dev)");
    expect(harness.stdout).toContain("✔ wsfe autorizado.");
    expect(harness.stdout).toContain("⚠ En homologación no se chequea el padrón A13");
    expect(harness.stdout).toContain("⚠ En homologación se usa el punto de venta 1");
    expect(harness.client.ElectronicBilling.getVoucherTypes).toHaveBeenCalledTimes(1);
    expect(harness.client.RegisterScopeThirteen.getTaxpayerDetails).not.toHaveBeenCalled();
    expect(harness.client.ElectronicBilling.getSalesPoints).not.toHaveBeenCalled();
    expect(harness.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ production: false, CUIT: "20123456789" }),
    );
  });

  it("warns without failing when the account has no sales points", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    harness.client.ElectronicBilling.getSalesPoints.mockResolvedValueOnce([]);

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.stdout).toContain("⚠ No hay puntos de venta para Factura Electrónica");
    expect(harness.output).not.toContain("✖");
  });

  it("treats a 'no sales points' error as a warning instead of a failure", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    harness.client.ElectronicBilling.getSalesPoints.mockRejectedValueOnce(
      new Error("No se encontraron puntos de venta para el tipo de comprobante"),
    );

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.stdout).toContain("⚠ No hay puntos de venta para Factura Electrónica");
    expect(harness.output).not.toContain("✖");
  });

  it("flags an unexpected sales point error", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    harness.client.ElectronicBilling.getSalesPoints.mockRejectedValueOnce(
      new Error("Error de conexión con AFIP"),
    );

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain(
      "✖ No se pudieron obtener los puntos de venta: Error de conexión con AFIP",
    );
  });

  it("warns when the certificate expires soon", async () => {
    const validUntil = Date.parse(new X509Certificate(testCertificate).validTo);
    const harness = createHarness({ now: () => validUntil - 10 * DAY_MS });
    writeCertificates(harness.directory, "prod");

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(harness.stdout).toContain("⚠ El certificado vence el");
    expect(harness.stdout).toContain("quedan 10 días");
    expect(harness.output).not.toContain("✖");
  });

  it("flags an expired certificate and skips remote checks", async () => {
    const validUntil = Date.parse(new X509Certificate(testCertificate).validTo);
    const harness = createHarness({ now: () => validUntil + DAY_MS });
    writeCertificates(harness.directory, "prod");

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain("✖ El certificado venció el");
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("flags a certificate that is not valid yet", async () => {
    const validFrom = Date.parse(new X509Certificate(testCertificate).validFrom);
    const harness = createHarness({ now: () => validFrom - DAY_MS });
    writeCertificates(harness.directory, "prod");

    const exitCode = await harness.run();

    expect(exitCode).toBe(1);
    expect(harness.stdout).toContain("✖ El certificado todavía no es válido");
    expect(harness.createClient).not.toHaveBeenCalled();
  });

  it("is read-only: never creates automations and never writes into the working directory", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");
    const before = fs.readdirSync(harness.directory, { recursive: true }).sort();

    const exitCode = await harness.run();

    expect(exitCode).toBe(0);
    expect(fs.readdirSync(harness.directory, { recursive: true }).sort()).toEqual(before);
    expect(harness.client.CreateAutomation).not.toHaveBeenCalled();
  });

  it("never prints the fiscal password, the access token or the private key", async () => {
    const harness = createHarness();
    writeCertificates(harness.directory, "prod");

    await harness.run();

    expect(harness.output).not.toContain(PASSWORD);
    expect(harness.output).not.toContain(ACCESS_TOKEN);
    expect(harness.output).not.toContain("BEGIN PRIVATE KEY");
  });
});
