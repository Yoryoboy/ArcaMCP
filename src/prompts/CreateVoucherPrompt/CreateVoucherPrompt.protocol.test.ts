import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it } from "vitest";
import { CreateVoucherPrompt } from "./CreateVoucherPrompt.js";

describe("CreateVoucherPrompt over MCP", () => {
  let client: Client | undefined;

  afterEach(async () => {
    await client?.close();
    client = undefined;
  });

  async function connect() {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    server.registerPrompt(CreateVoucherPrompt.name, CreateVoucherPrompt.metadata, (args) =>
      CreateVoucherPrompt.build(args),
    );
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    client = new Client({ name: "test-client", version: "0.0.0" });
    await client.connect(clientTransport);
    return client;
  }

  it("lists every prompt argument as optional with its description", async () => {
    const { prompts } = await (await connect()).listPrompts();
    const args = prompts.find((prompt) => prompt.name === CreateVoucherPrompt.name)?.arguments;

    expect(args?.length).toBeGreaterThan(0);
    for (const arg of args ?? []) {
      expect(arg.required, arg.name).toBe(false);
      expect(arg.description, arg.name).toEqual(expect.any(String));
    }
    expect(args?.find((arg) => arg.name === "modoNumeracion")?.description).toBe(
      "Método de numeración. 'automatico' usa create_next_voucher. 'manual' usa create_voucher y requiere CbteDesde/CbteHasta.",
    );
  });

  it("completes prompt arguments through completion/complete", async () => {
    const result = await (
      await connect()
    ).complete({
      ref: { type: "ref/prompt", name: CreateVoucherPrompt.name },
      argument: { name: "modoNumeracion", value: "au" },
    });

    expect(result.completion.values).toEqual(["automatico"]);
  });
});
