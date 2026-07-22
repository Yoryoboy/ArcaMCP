import * as fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findTemplate,
  formatAmountAR,
  formatDateDDMMYYYY,
  formatDateISO,
  renderItems,
} from "./CreatePDFTool.helpers.js";

describe("CreatePDFTool helpers", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it.each([
    { input: undefined, expected: "" },
    { input: "", expected: "" },
    { input: "20260614", expected: "14/06/2026" },
    { input: "2026-06-14", expected: "2026-06-14" },
  ])("formats DD/MM/YYYY for $input", ({ input, expected }) => {
    expect(formatDateDDMMYYYY(input)).toBe(expected);
  });

  it.each([
    { input: undefined, expected: "" },
    { input: "", expected: "" },
    { input: "20260614", expected: "2026-06-14" },
    { input: "2026/06/14", expected: "2026/06/14" },
  ])("formats ISO dates for $input", ({ input, expected }) => {
    expect(formatDateISO(input)).toBe(expected);
  });

  it("keeps omitted product service dates blank for PDF replacements", () => {
    expect(formatDateDDMMYYYY(undefined)).toBe("");
    expect(formatDateISO(undefined)).toBe("");
  });

  it("formats AR amounts with two decimals", () => {
    expect(formatAmountAR(1234.5)).toBe("1.234,50");
  });

  it("renders escaped invoice item rows with sequential codes", () => {
    const rows = renderItems([
      {
        descripcion: "<b>Consulting</b>",
        cantidad: 2,
        precioUnitario: 1500,
        importe: 3000,
      },
      {
        descripcion: "Support",
        cantidad: 1,
        precioUnitario: 500,
        importe: 500,
      },
    ]);

    expect(rows).toContain("001");
    expect(rows).toContain("002");
    expect(rows).toContain("&lt;b&gt;Consulting&lt;/b&gt;");
    expect(rows).toContain("3.000,00");
    expect(rows).toContain("500,00");
    expect(rows).toContain("Unidad");
  });

  it("returns an empty string when there are no invoice items", () => {
    expect(renderItems([])).toBe("");
    expect(renderItems(undefined)).toBe("");
  });

  it("reads the HTML template from the current working directory first", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-pdf-template-"));
    const templateDir = path.join(tempDir, "templates");
    const templatePath = path.join(templateDir, "bill.html");
    const templateContents = "<html>from-temp-template</html>";

    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(templatePath, templateContents, "utf8");
    process.chdir(tempDir);

    expect(findTemplate()).toBe(templateContents);
  });
});
