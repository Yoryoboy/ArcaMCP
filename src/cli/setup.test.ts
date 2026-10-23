import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigValues } from "../configValidation.js";
import type { Prompter } from "./prompt.js";
import { runSetup } from "./setup.js";

const PASSWORD = "clave-fiscal-secreta";

function baseConfig(overrides: Partial<ConfigValues> = {}): ConfigValues {
  return {
    CUIT: "20123456789",
    PASSWORD,
    CERT_ALIAS: "mi-alias",
    ACCESS_TOKEN: "sdk-token",
    AFIP_PRODUCTION: false,
    ...overrides,
  };
}

function harness(config: ConfigValues, prompter?: Prompter) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "arcamcp-setup-"));
  const out: string[] = [];
  const err: string[] = [];
  const createAutomation = vi.fn(async (automation: string) =>
    automation.startsWith("create-cert")
      ? { id: "1", status: "complete", data: { cert: "CERT-PEM", key: "KEY-PEM" } }
      : { id: "2", status: "complete", data: { status: "created" } },
  );
  const createClient = vi.fn(() => ({ CreateAutomation: createAutomation }));
  const run = (options: Parameters<typeof runSetup>[0] = {}) =>
    runSetup(options, {
      config,
      cwd,
      prompter: prompter ?? { interactive: false, ask: vi.fn() },
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
      createClient,
    });

  return { cwd, out, err, run, createAutomation, createClient, output: () => out.join("") };
}

describe("arcamcp setup", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("onboards homologación from AFIP_PRODUCTION=false: certificate, .env, services and client config", async () => {
    const h = harness(baseConfig());

    const code = await h.run();

    expect(code).toBe(0);
    expect(h.createClient).toHaveBeenCalledWith({
      CUIT: "20123456789",
      production: false,
      access_token: "sdk-token",
    });
    const credentials = {
      cuit: "20123456789",
      username: "20123456789",
      password: PASSWORD,
      alias: "mi-alias",
    };
    expect(h.createAutomation.mock.calls).toEqual([
      ["create-cert-dev", credentials, true],
      ["auth-web-service-dev", { ...credentials, service: "wsfe" }, true],
      ["auth-web-service-dev", { ...credentials, service: "ws_sr_padron_a13" }, true],
    ]);

    const cert = path.join(h.cwd, "certs", "dev", "dev_certificado.crt");
    const key = path.join(h.cwd, "certs", "dev", "dev_private.key");
    expect(fs.readFileSync(cert, "utf8")).toBe("CERT-PEM");
    expect(fs.readFileSync(key, "utf8")).toBe("KEY-PEM");
    expect(fs.statSync(key).mode & 0o777).toBe(0o600);

    expect(fs.readFileSync(path.join(h.cwd, ".env"), "utf8")).toBe(
      [
        "AFIP_CUIT=20123456789",
        "AFIP_CERT_ALIAS=mi-alias",
        "AFIP_SDK_ACCESS_TOKEN=sdk-token",
        `AFIP_DEV_CERT_PATH=${cert}`,
        `AFIP_DEV_KEY_PATH=${key}`,
        "AFIP_PRODUCTION=false",
        "",
      ].join("\n"),
    );

    const printed = h.output();
    const json = JSON.parse(printed.slice(printed.indexOf("{"), printed.lastIndexOf("}") + 1));
    expect(json).toEqual({
      "arca-mcp": {
        command: "npx",
        args: ["-y", "@yoryoboy/arcamcp@latest"],
        env: {
          AFIP_CUIT: "20123456789",
          AFIP_CERT_ALIAS: "mi-alias",
          AFIP_SDK_ACCESS_TOKEN: "sdk-token",
          AFIP_DEV_CERT_PATH: cert,
          AFIP_DEV_KEY_PATH: key,
          AFIP_PRODUCTION: "false",
        },
      },
    });
    expect(printed + h.err.join("")).not.toContain(PASSWORD);
  });

  it("uses the production automations and paths with --prod and keeps the rest of an existing .env", async () => {
    const h = harness(baseConfig());
    fs.writeFileSync(
      path.join(h.cwd, ".env"),
      "# mio\nAFIP_PRODUCTION=false\nAFIP_PASSWORD=" + PASSWORD + "\nOTRA=1\n",
    );

    const code = await h.run({ environment: "prod" });

    expect(code).toBe(0);
    expect(h.createClient).toHaveBeenCalledWith(expect.objectContaining({ production: true }));
    expect(h.createAutomation.mock.calls.map(([name]) => name)).toEqual([
      "create-cert-prod",
      "auth-web-service-prod",
      "auth-web-service-prod",
    ]);
    const cert = path.join(h.cwd, "certs", "prod", "prod_certificado.crt");
    const env = fs.readFileSync(path.join(h.cwd, ".env"), "utf8");
    expect(env).toBe(
      [
        "# mio",
        "AFIP_PRODUCTION=false",
        `AFIP_PASSWORD=${PASSWORD}`,
        "OTRA=1",
        "AFIP_CUIT=20123456789",
        "AFIP_CERT_ALIAS=mi-alias",
        "AFIP_SDK_ACCESS_TOKEN=sdk-token",
        `AFIP_PROD_CERT_PATH=${cert}`,
        `AFIP_PROD_KEY_PATH=${path.join(h.cwd, "certs", "prod", "prod_private.key")}`,
        "",
      ].join("\n"),
    );
  });

  it("refuses to replace an existing certificate without --force and contacts nothing", async () => {
    const h = harness(baseConfig());
    const directory = path.join(h.cwd, "certs", "dev");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "dev_private.key"), "OLD-KEY");

    const code = await h.run();

    expect(code).toBe(1);
    expect(h.err.join("")).toContain("Usá --force");
    expect(h.createClient).not.toHaveBeenCalled();
    expect(fs.readFileSync(path.join(directory, "dev_private.key"), "utf8")).toBe("OLD-KEY");
    expect(fs.existsSync(path.join(h.cwd, ".env"))).toBe(false);
  });

  it("replaces an existing certificate with --force", async () => {
    const h = harness(baseConfig());
    const directory = path.join(h.cwd, "certs", "dev");
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, "dev_private.key"), "OLD-KEY");

    expect(await h.run({ force: true })).toBe(0);
    expect(fs.readFileSync(path.join(directory, "dev_private.key"), "utf8")).toBe("KEY-PEM");
  });

  it("asks for the password without echo when AFIP_PASSWORD is not set and never stores it", async () => {
    const ask = vi.fn(async () => PASSWORD);
    const h = harness(baseConfig({ PASSWORD: undefined }), { interactive: true, ask });

    expect(await h.run()).toBe(0);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledWith(expect.stringContaining("Clave fiscal"), { hidden: true });
    expect((h.createAutomation.mock.calls[0] as unknown[])[1]).toMatchObject({
      password: PASSWORD,
    });
    expect(fs.readFileSync(path.join(h.cwd, ".env"), "utf8")).not.toContain(PASSWORD);
    expect(h.output() + h.err.join("")).not.toContain(PASSWORD);
  });

  it("lists every missing value and stops when it cannot prompt", async () => {
    const h = harness(baseConfig({ PASSWORD: undefined, CERT_ALIAS: undefined, ACCESS_TOKEN: "" }));

    expect(await h.run()).toBe(1);
    expect(h.err.join("")).toContain(
      "- Falta AFIP_CERT_ALIAS.\n" +
        "- Falta AFIP_SDK_ACCESS_TOKEN (requerida para las automatizaciones de setup).\n" +
        "- Falta AFIP_PASSWORD (clave fiscal).\n",
    );
    expect(h.createClient).not.toHaveBeenCalled();
    expect(fs.readdirSync(h.cwd)).toEqual([]);
  });

  it("writes nothing when the certificate automation does not complete", async () => {
    const h = harness(baseConfig());
    h.createAutomation.mockResolvedValueOnce({
      id: "1",
      status: "error",
      data: undefined,
    } as never);

    expect(await h.run()).toBe(1);
    expect(h.err.join("")).toContain("Estado: error");
    expect(h.createAutomation).toHaveBeenCalledTimes(1);
    expect(fs.readdirSync(h.cwd)).toEqual([]);
  });

  it("keeps the certificate and .env but exits 1 when a service cannot be authorized", async () => {
    const h = harness(baseConfig());
    h.createAutomation.mockImplementation(async (automation: string, params?: unknown) => {
      if (automation.startsWith("create-cert")) {
        return { id: "1", status: "complete", data: { cert: "CERT-PEM", key: "KEY-PEM" } };
      }
      if ((params as { service: string }).service === "wsfe") {
        throw new Error("timeout");
      }
      return { id: "2", status: "complete", data: { status: "created" } };
    });

    expect(await h.run()).toBe(1);
    expect(h.err.join("")).toContain("- wsfe: falló la autorización: timeout");
    expect(h.output()).toContain("- ws_sr_padron_a13: autorizado.");
    expect(fs.existsSync(path.join(h.cwd, "certs", "dev", "dev_certificado.crt"))).toBe(true);
    expect(fs.existsSync(path.join(h.cwd, ".env"))).toBe(true);
  });
});
