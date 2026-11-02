import fs from "fs";
import os from "os";
import path from "path";
import { parseEnv } from "util";
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

  it("quotes values so Windows paths and spaces are read literally", () => {
    expect(updateEnvContent("", { P: "C:\\new folder\\cert.crt", Q: "it's" })).toBe(
      "P='C:\\new folder\\cert.crt'\nQ=`it's`\n",
    );
  });

  it("writes values that Node's .env parser reads back unchanged", () => {
    const values = {
      PLAIN: "abc-1.2/x:y@z+",
      WINDOWS_PATH: "C:\\certs\\new folder\\cert.crt",
      APOSTROPHE_PATH: "C:\\Users\\O'Brien\\new\\cert.crt",
      HASH: "v#1 x",
      DOLLAR: "a$b ${HOME}",
      BOTH_QUOTES: `it's "quoted"`,
      ALL_QUOTES_NO_BACKSLASH: "it's `tick`",
      EMPTY: "",
    };

    expect(parseEnv(updateEnvContent("", values))).toEqual(values);
  });

  it("rejects a value that no .env quoting can represent", () => {
    for (const value of [`a'b"c\`d`, "C:\\it's\\`x`"]) {
      expect(() => updateEnvContent("", { AFIP_CERT_ALIAS: value })).toThrow(
        "AFIP_CERT_ALIAS no puede guardarse en .env: contiene comillas simples y backticks junto con comillas dobles o barras invertidas.",
      );
    }
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
