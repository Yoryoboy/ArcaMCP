import { describe, expect, it, vi } from "vitest";
import { HELP_TEXT, runCli } from "./cli.js";

function harness() {
  const out: string[] = [];
  const err: string[] = [];
  const setup = vi.fn(async () => 0);
  const doctor = vi.fn(async () => 0);
  const run = (argv: string[]) =>
    runCli(argv, {
      stdout: (text) => out.push(text),
      stderr: (text) => err.push(text),
      setup,
      doctor,
    });
  return { out, err, setup, doctor, run };
}

describe("arcamcp command line", () => {
  it("starts the MCP server when called without arguments", async () => {
    const h = harness();

    expect(await h.run([])).toBe("server");
    expect(h.out).toEqual([]);
    expect(h.err).toEqual([]);
  });

  it.each([["help"], ["--help"], ["-h"]])("prints the help with %s", async (flag) => {
    const h = harness();

    expect(await h.run([flag])).toBe(0);
    expect(h.out.join("")).toBe(HELP_TEXT);
    expect(HELP_TEXT).toContain("arcamcp setup [--dev | --prod] [--force]");
    expect(HELP_TEXT).toContain("arcamcp doctor");
  });

  it("runs setup with the environment taken from config unless a flag selects it", async () => {
    const h = harness();

    await h.run(["setup"]);
    await h.run(["setup", "--prod", "--force"]);
    await h.run(["setup", "--dev"]);

    expect(h.setup.mock.calls).toEqual([
      [{ environment: undefined, force: false }],
      [{ environment: "prod", force: true }],
      [{ environment: "dev", force: false }],
    ]);
  });

  it("returns the exit code of the command it runs", async () => {
    const h = harness();
    h.doctor.mockResolvedValueOnce(1);

    expect(await h.run(["doctor"])).toBe(1);
    expect(h.doctor).toHaveBeenCalledTimes(1);
  });

  it("rejects --dev together with --prod without running setup", async () => {
    const h = harness();

    expect(await h.run(["setup", "--dev", "--prod"])).toBe(2);
    expect(h.err.join("")).toBe("Usá --dev o --prod, no ambos.\n");
    expect(h.setup).not.toHaveBeenCalled();
  });

  it.each([
    [["facturar"], "Comando desconocido: facturar\n"],
    [["setup", "--prod=1"], "Opción inválida para setup: --prod=1\n"],
    [["setup", "--verbose"], "Opción inválida para setup: --verbose\n"],
    [["doctor", "--fix"], "Opción inválida para doctor: --fix\n"],
  ])("rejects %j with exit code 2 and the help on stderr", async (argv, message) => {
    const h = harness();

    expect(await h.run(argv)).toBe(2);
    expect(h.err.join("")).toBe(`${message}\n${HELP_TEXT}`);
    expect(h.out).toEqual([]);
    expect(h.setup).not.toHaveBeenCalled();
    expect(h.doctor).not.toHaveBeenCalled();
  });
});
