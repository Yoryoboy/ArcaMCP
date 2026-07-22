import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createAutomation = vi.fn();
  const constructorCalls: Array<Record<string, unknown>> = [];
  const mkdirSync = vi.fn();
  const writeFileSync = vi.fn();

  class MockAfip {
    constructor(options: Record<string, unknown>) {
      constructorCalls.push(options);
    }

    CreateAutomation = createAutomation;
  }

  return {
    config: {
      CUIT: "20123456789",
      ACCESS_TOKEN: "mock-access-token",
      PASSWORD: "mock-password",
      CERT_ALIAS: "mock-alias",
    },
    constructorCalls,
    createAutomation,
    mkdirSync,
    MockAfip,
    writeFileSync,
  };
});

vi.mock("@afipsdk/afip.js", () => ({ default: mocks.MockAfip }));
vi.mock("../../config.js", () => ({ default: mocks.config }));
vi.mock("fs", () => ({
  default: {
    mkdirSync: mocks.mkdirSync,
    writeFileSync: mocks.writeFileSync,
  },
}));

const scriptUrl = new URL("../../../scripts/getProdCerts.ts", import.meta.url).href;

describe("production certificate bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.constructorCalls.length = 0;
    mocks.createAutomation.mockReset();
    mocks.mkdirSync.mockReset();
    mocks.writeFileSync.mockReset();
  });

  it("creates a certificate-only client and writes completed automation output", async () => {
    mocks.createAutomation.mockResolvedValue({
      id: "automation-id",
      status: "complete",
      data: { cert: "mock-certificate", key: "mock-private-key" },
    });

    await import(scriptUrl);

    expect(mocks.constructorCalls).toEqual([
      {
        CUIT: "20123456789",
        production: true,
        access_token: "mock-access-token",
      },
    ]);
    expect(mocks.createAutomation).toHaveBeenCalledWith(
      "create-cert-prod",
      {
        CUIT: "20123456789",
        username: "20123456789",
        password: "mock-password",
        alias: "mock-alias",
      },
      true,
    );

    const targetDir = path.join(process.cwd(), "certs", "prod");
    expect(mocks.mkdirSync).toHaveBeenCalledWith(targetDir, { recursive: true });
    expect(mocks.writeFileSync).toHaveBeenNthCalledWith(
      1,
      path.join(targetDir, "prod_certificado.crt"),
      "mock-certificate",
      { encoding: "utf-8" },
    );
    expect(mocks.writeFileSync).toHaveBeenNthCalledWith(
      2,
      path.join(targetDir, "prod_private.key"),
      "mock-private-key",
      { encoding: "utf-8" },
    );
  });

  it("does not swallow automation failures", async () => {
    mocks.createAutomation.mockRejectedValue(new Error("automation failed"));

    await expect(import(scriptUrl)).rejects.toThrow("automation failed");
    expect(mocks.writeFileSync).not.toHaveBeenCalled();
  });
});
