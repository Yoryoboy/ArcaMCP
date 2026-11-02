import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("config", () => {
  const originalCwd = process.cwd();
  let tempDir: string | undefined;

  afterEach(() => {
    process.chdir(originalCwd);
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
    delete process.env.AFIP_CUIT;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads .env from the working directory without writing to stdout or stderr", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "arcamcp-config-"));
    writeFileSync(join(tempDir, ".env"), "AFIP_CUIT=20123456789\n");
    process.chdir(tempDir);
    delete process.env.AFIP_CUIT;
    const stdout = vi.spyOn(process.stdout, "write");
    const stderr = vi.spyOn(process.stderr, "write");
    const consoleLog = vi.spyOn(console, "log");
    const consoleError = vi.spyOn(console, "error");

    vi.resetModules();
    const { default: config } = await import("./config.js");

    expect(config.CUIT).toBe("20123456789");
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
