import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const entry = join(import.meta.dirname, "index.ts");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { name: string; version: string };

function initialize(cwd: string): Promise<{ result: { serverInfo: unknown } }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, entry], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      const line = stdout.split("\n").find((candidate) => candidate.trim() !== "");
      if (line && stdout.includes("\n")) {
        child.kill();
        resolve(JSON.parse(line));
      }
    });
    child.on("error", reject);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      })}\n`,
    );
  });
}

describe("stdio server", () => {
  let cwd: string | undefined;

  afterEach(() => {
    if (cwd) rmSync(cwd, { recursive: true, force: true });
    cwd = undefined;
  });

  it("announces arcamcp and the published package version in the initialize handshake", async () => {
    cwd = mkdtempSync(join(tmpdir(), "arcamcp-server-"));

    const response = await initialize(cwd);

    expect(response.result.serverInfo).toEqual({
      name: "arcamcp",
      version: packageJson.version,
    });
  }, 20_000);
});
