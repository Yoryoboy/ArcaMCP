import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const readFileSync = vi.fn<(path: string, encoding: string) => string>();
  const constructorCalls: Array<Record<string, unknown>> = [];
  const certificate = `-----BEGIN CERTIFICATE-----
MIIDJzCCAg+gAwIBAgIUc7+M4+2/2NOT9SDu4f+S6qvLT5AwDQYJKoZIhvcNAQEL
BQAwIzEhMB8GA1UEAwwYQXJjYU1DUCB0ZXN0IGNlcnRpZmljYXRlMB4XDTI2MDgy
MTE0NDExM1oXDTM2MDgxODE0NDExM1owIzEhMB8GA1UEAwwYQXJjYU1DUCB0ZXN0
IGNlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxweM
We7sX5ouQ3lTxAWl6G7iPKMmWaRBeyTXlqwZZfW+nXTog8vQ576yKyu5ajP8mi8J
mWVrjzqubmHMQJIEg1rtvPav8td1jWY7nrcWPhoddn2A1m8TGBh2ewH8w75u0O1Q
3V7F7vVqf2GoYiQWOO/KV28f7ONOIxHnTWtfuUzFzbDatGwu8zAPF2u/zpvoN/y2
VjdUQpkkxOyNNc880UmbxumWx9gUHNDxTNDG9vIu5A4WiF42vfyJgmuEbyZLyUcW
dONmOtkvCNpiUEpg+o8QY6dJ1fZIYX9ChJ0rAmyog2HA3eHDFIpIp8Ygc/t5xgur
/0UQirV/3zgPcdVdtwIDAQABo1MwUTAdBgNVHQ4EFgQUp1wg7d8aSv734qcACHnd
Ryu2SMMwHwYDVR0jBBgwFoAUp1wg7d8aSv734qcACHndRyu2SMMwDwYDVR0TAQH/
BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAceAX/JiO2HRWxPSbFeBoYNJqLAuV
j1W6vYKFg+P7ZqW+RigV54ViHfHW1YSK+q501WSsKZ67dUJzlyKLN511lhiPWUQZ
CLNjrdUPZCbg6ioM1e6dHn6P5ZVLbvuGqnvE0o9CpHKudoXnPwpD/GMHu0zfMrzl
xxcFY/F5DALJv1XHaeOPiXXBr6wUH9Vrc14HKMOD3Lf3itqpZXFSoi911n3wazmi
48SfRf/hH2QwTmMe3qb0LS7Cm6iiuOpvHu+DsPIHanb4UCHz4bVbQbP0yoRD2XQa
JpG3H1TPUWgN+gghO96fQzm1yGVq6YrF+wDfEqijE2UdDiASSvdrLap9XQ==
-----END CERTIFICATE-----`;
  const config = {
    CUIT: "20123456789",
    DEV_CERT_PATH: "/certs/dev.crt",
    DEV_KEY_PATH: "/certs/dev.key",
    PROD_CERT_PATH: "/certs/prod.crt",
    PROD_KEY_PATH: "/certs/prod.key",
    AFIP_PRODUCTION: false,
    ACCESS_TOKEN: "token",
  };

  class MockAfip {
    options: Record<string, unknown>;
    ElectronicBilling: Record<string, unknown>;

    constructor(options: Record<string, unknown>) {
      constructorCalls.push(options);
      this.options = options;
      this.ElectronicBilling = {
        options,
      };
    }
  }

  return {
    MockAfip,
    config,
    constructorCalls,
    readFileSync,
    certificate,
  };
});

vi.mock("@afipsdk/afip.js", () => ({
  default: mocks.MockAfip,
}));

vi.mock("fs", () => ({
  default: {
    readFileSync: mocks.readFileSync,
  },
}));

vi.mock("../../config.js", () => ({
  default: mocks.config,
}));

describe("AFIP client factory", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.constructorCalls.length = 0;
    mocks.config.AFIP_PRODUCTION = false;
    mocks.readFileSync.mockReset();
    mocks.readFileSync.mockImplementation((path) =>
      path.endsWith(".crt") ? mocks.certificate : `${path}:utf8`,
    );
  });

  it("builds a client from injected options", async () => {
    const { createAfipClient } = await import("./client.js");
    mocks.constructorCalls.length = 0;

    const client = createAfipClient({
      cert: "cert",
      key: "key",
      CUIT: "20123456789",
      production: true,
      access_token: "token",
    });

    expect(client).toBeInstanceOf(mocks.MockAfip);
    expect(mocks.constructorCalls).toEqual([
      {
        cert: "cert",
        key: "key",
        CUIT: "20123456789",
        production: true,
        access_token: "token",
      },
    ]);
  });

  it("reads the development certificate paths when production is disabled", async () => {
    const { loadAfipOptionsFromConfig } = await import("./client.js");
    mocks.readFileSync.mockClear();

    const result = loadAfipOptionsFromConfig();

    expect(mocks.readFileSync).toHaveBeenNthCalledWith(1, "/certs/dev.crt", "utf8");
    expect(mocks.readFileSync).toHaveBeenNthCalledWith(2, "/certs/dev.key", "utf8");
    expect(result).toMatchObject({
      cert: mocks.certificate,
      key: "/certs/dev.key:utf8",
      production: false,
    });
  });

  it("reads the production certificate paths when production is enabled", async () => {
    mocks.config.AFIP_PRODUCTION = true;
    const { loadAfipOptionsFromConfig } = await import("./client.js");
    mocks.readFileSync.mockClear();

    const result = loadAfipOptionsFromConfig();

    expect(mocks.readFileSync).toHaveBeenNthCalledWith(1, "/certs/prod.crt", "utf8");
    expect(mocks.readFileSync).toHaveBeenNthCalledWith(2, "/certs/prod.key", "utf8");
    expect(result).toMatchObject({
      cert: mocks.certificate,
      key: "/certs/prod.key:utf8",
      production: true,
    });
  });

  it("does not read certificates during module import and builds the default client on first use", async () => {
    const module = await import("./client.js");

    expect(mocks.readFileSync).not.toHaveBeenCalled();
    expect(mocks.constructorCalls).toHaveLength(0);

    expect(module.default.ElectronicBilling).toEqual({
      options: mocks.constructorCalls[0],
    });
    const first = module.getDefaultAfipClient();
    const second = module.getDefaultAfipClient();

    expect(first).toBe(second);
    expect(mocks.constructorCalls).toHaveLength(1);
  });

  it("imports successfully and fails on first use with a configuration error when a certificate is unreadable", async () => {
    mocks.readFileSync.mockImplementation(() => {
      throw Object.assign(new Error("ENOENT: no such file '/certs/dev.crt'"), { code: "ENOENT" });
    });

    const module = await import("./client.js");

    expect(() => module.default.ElectronicBilling).toThrow(
      expect.objectContaining({
        name: "ConfigurationError",
        issues: ["No se pudo leer el archivo indicado en AFIP_DEV_CERT_PATH (ENOENT)."],
      }),
    );
    expect(() => module.getDefaultCertificateStatus()).toThrow("AFIP_DEV_CERT_PATH");
    expect(mocks.constructorCalls).toHaveLength(0);
  });

  it("fails on first use with every missing variable instead of reading undefined paths", async () => {
    const previous = mocks.config.DEV_KEY_PATH;
    (mocks.config as Record<string, unknown>).DEV_KEY_PATH = undefined;
    try {
      const module = await import("./client.js");

      expect(() => module.getDefaultAfipClient()).toThrow(
        expect.objectContaining({
          code: "CONFIGURATION_ERROR",
          issues: ["Falta AFIP_DEV_KEY_PATH."],
        }),
      );
      expect(mocks.readFileSync).not.toHaveBeenCalled();
    } finally {
      mocks.config.DEV_KEY_PATH = previous;
    }
  });

  it("reports an invalid certificate PEM as a configuration error", async () => {
    mocks.readFileSync.mockImplementation((path) => `${path}:not-a-pem`);
    const module = await import("./client.js");

    expect(() => module.getDefaultCertificateStatus()).toThrow(
      expect.objectContaining({
        issues: [
          "El archivo indicado en AFIP_DEV_CERT_PATH no es un certificado X.509 PEM válido.",
        ],
      }),
    );
  });
});
