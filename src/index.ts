#!/usr/bin/env node

import { runCli } from "./cli/cli.js";

const stdout = (text: string) => void process.stdout.write(text);
const stderr = (text: string) => void process.stderr.write(text);

// Commands are loaded on demand so the MCP server never pays for the CLI and
// the CLI never registers tools or opens the stdio transport.
const result = await runCli(process.argv.slice(2), {
  stdout,
  stderr,
  async setup(options) {
    const [{ runSetup }, { createTerminalPrompter }, { default: config }] = await Promise.all([
      import("./cli/setup.js"),
      import("./cli/prompt.js"),
      import("./config.js"),
    ]);
    return runSetup(options, {
      config,
      cwd: process.cwd(),
      prompter: createTerminalPrompter(),
      stdout,
      stderr,
    });
  },
  async doctor() {
    const [{ runDoctor }, { default: config }] = await Promise.all([
      import("./cli/doctor.js"),
      import("./config.js"),
    ]);
    return runDoctor({ config, cwd: process.cwd(), stdout, stderr });
  },
});

if (result === "server") {
  await import("./server.js");
} else {
  process.exitCode = result;
}
