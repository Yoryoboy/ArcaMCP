import { describe, expect, it, vi } from "vitest";
import { createCertificatePreflight } from "./certificatePreflight.js";
import type { CertificateStatusMonitor } from "./certificateStatus.js";

function monitor(status: "valid" | "expiring_soon" | "expired" | "not_yet_valid") {
  return {
    getStatus: vi.fn(() => ({
      environment: "production" as const,
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: "2026-04-01T00:00:00.000Z",
      daysRemaining: status === "expiring_soon" ? 90 : status === "expired" ? -1 : 100,
      status,
      warningThresholdDays: 90,
    })),
  } satisfies CertificateStatusMonitor;
}

describe("certificate preflight", () => {
  it("blocks expired and not-yet-valid calls without invoking the handler", async () => {
    for (const status of ["expired", "not_yet_valid"] as const) {
      const handler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "called" }] });
      const response = await createCertificatePreflight(monitor(status)).wrap(handler, true)();

      expect(response.isError).toBe(true);
      expect(JSON.parse(response.content[0].text)).toMatchObject({
        code: status === "expired" ? "CERTIFICATE_EXPIRED" : "CERTIFICATE_NOT_YET_VALID",
        certificate: { status },
      });
      expect(handler).not.toHaveBeenCalled();
    }
  });

  it("warns once and preserves the original response", async () => {
    const handler = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "original" }],
      isError: false,
    });
    const wrapped = createCertificatePreflight(monitor("expiring_soon")).wrap(handler, true);

    const first = await wrapped();
    const second = await wrapped();

    expect(first.content[0]).toEqual({ type: "text", text: "original" });
    expect(first.content).toHaveLength(2);
    expect(first._meta?.certificateWarning).toMatchObject({ code: "CERTIFICATE_EXPIRING_SOON" });
    expect(second).toEqual({ content: [{ type: "text", text: "original" }], isError: false });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("does not warn tools that do not require the certificate", async () => {
    const handler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "original" }] });
    const response = await createCertificatePreflight(monitor("expiring_soon")).wrap(
      handler,
      false,
    )();

    expect(response).toEqual({ content: [{ type: "text", text: "original" }] });
  });
});

describe("certificate preflight with an unusable configuration", () => {
  const failingMonitor = {
    getStatus: vi.fn(() => {
      throw Object.assign(
        new Error("ArcaMCP no está configurado correctamente: Falta AFIP_CUIT."),
        {
          name: "ConfigurationError",
          code: "CONFIGURATION_ERROR",
          issues: ["Falta AFIP_CUIT."],
        },
      );
    }),
  } satisfies CertificateStatusMonitor;

  it("returns a configuration error for certificate-dependent tools without invoking them", async () => {
    const handler = vi.fn();
    const response = await createCertificatePreflight(failingMonitor).wrap(handler, true)();

    expect(response.isError).toBe(true);
    expect(JSON.parse(response.content[0].text)).toMatchObject({
      success: false,
      kind: "configuration",
      code: "CONFIGURATION_ERROR",
      details: { issues: ["Falta AFIP_CUIT."] },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("never inspects the certificate for tools that do not require it", async () => {
    failingMonitor.getStatus.mockClear();
    const handler = vi.fn().mockResolvedValue({ content: [{ type: "text", text: "original" }] });

    const response = await createCertificatePreflight(failingMonitor).wrap(handler, false)();

    expect(response).toEqual({ content: [{ type: "text", text: "original" }] });
    expect(failingMonitor.getStatus).not.toHaveBeenCalled();
  });
});
