import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { updateEnvContent, writeEnvFile } from "./envFile.js";

describe("updateEnvContent", () => {
  it("replaces existing assignments in place and keeps comments and unrelated keys", () => {
    const content = "# Identidad\nAFIP_CUIT=1\nOTHER=keep # comment\nexport AFIP_CERT_ALIAS=old\n";

    expect(updateEnvContent(content, { AFIP_CUIT: "20123456789", AFIP_CERT_ALIAS: "nuevo" })).toBe(
      "# Identidad\nAFIP_CUIT=20123456789\nOTHER=keep # comment\nAFIP_CERT_ALIAS=nuevo\n",
    );
  });

  it("appends missing keys and creates content from scratch", () => {
    expect(updateEnvContent("", { A: "1", B: "2" })).toBe("A=1\nB=2\n");
    expect(updateEnvContent("A=1", { B: "2" })).toBe("A=1\nB=2\n");
  });

  it("quotes values so dotenv reads Windows paths and spaces literally", () => {
    expect(updateEnvContent("", { P: "C:\\new folder\\cert.crt", Q: "it's" })).toBe(
      "P='C:\\new folder\\cert.crt'\nQ=\"it's\"\n",
    );
  });
});

describe("writeEnvFile", () => {
  it("creates the file with owner-only permissions and leaves no temporary file", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "arcamcp-env-"));
    const envPath = path.join(directory, ".env");

    writeEnvFile(envPath, { A: "1" });
    writeEnvFile(envPath, { B: "2" });

    expect(fs.readFileSync(envPath, "utf8")).toBe("A=1\nB=2\n");
    expect(fs.statSync(envPath).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(directory)).toEqual([".env"]);
  });
});
