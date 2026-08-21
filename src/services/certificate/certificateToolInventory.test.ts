import { describe, expect, it } from "vitest";

import { certificateDependentTools } from "./certificateToolInventory.js";

describe("certificate-dependent tool inventory", () => {
  it("keeps automation and certificate diagnostics outside the X.509 preflight", () => {
    expect(certificateDependentTools).not.toContain("mis_comprobantes");
    expect(certificateDependentTools).not.toContain("get_automation_details");
    expect(certificateDependentTools).not.toContain("get_certificate_status");
    expect(certificateDependentTools).toContain("create_pdf");
  });
});
