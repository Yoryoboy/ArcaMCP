import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/afip/client.js", () => ({
  getDefaultCertificateStatus: () => {
    throw Object.assign(
      new Error("ArcaMCP no está configurado correctamente: Falta AFIP_PROD_CERT_PATH."),
      {
        name: "ConfigurationError",
        code: "CONFIGURATION_ERROR",
        issues: ["Falta AFIP_PROD_CERT_PATH."],
      },
    );
  },
}));

import { GetCertificateStatusTool } from "./GetCertificateStatusTool.js";

describe("get_certificate_status with an unusable configuration", () => {
  it("reports the configuration issues instead of failing the server", async () => {
    const response = await GetCertificateStatusTool.execute();

    expect(response.isError).toBe(true);
    expect(JSON.parse(response.content[0].text)).toMatchObject({
      success: false,
      error: "ArcaMCP no está configurado correctamente: Falta AFIP_PROD_CERT_PATH.",
      kind: "configuration",
      code: "CONFIGURATION_ERROR",
      details: { issues: ["Falta AFIP_PROD_CERT_PATH."] },
    });
  });
});
