import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/afip/client.js", () => ({
  getDefaultCertificateStatus: () => ({
    getStatus: () => ({
      environment: "production",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-04-01T00:00:00.000Z",
      daysRemaining: -10,
      status: "expired",
      warningThresholdDays: 90,
    }),
  }),
}));

import { GetCertificateStatusTool } from "./GetCertificateStatusTool.js";

describe("get_certificate_status", () => {
  it("is available and returns safe status data even when the certificate is expired", async () => {
    const response = await GetCertificateStatusTool.execute();
    const payload = JSON.parse(response.content[0].text);

    expect(payload).toEqual({
      environment: "production",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-04-01T00:00:00.000Z",
      daysRemaining: -10,
      status: "expired",
      warningThresholdDays: 90,
    });
    expect(JSON.stringify(payload)).not.toMatch(/pem|key|cuit|subject|issuer|path/i);
  });
});
