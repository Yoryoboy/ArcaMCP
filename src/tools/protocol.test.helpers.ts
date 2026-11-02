// Import this module before anything that loads the server: it pulls in the AFIP
// client and config mocks first, so protocol tests never reach the real AFIP
// services or read the developer's .env values.
import { getMocks } from "./CreateVoucherTool/ToolExecution.test.helpers.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach } from "vitest";
import { createServer } from "../server.js";

export { getMocks };

const validCertificate = {
  getStatus: () => ({
    environment: "production" as const,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2028-01-01T00:00:00.000Z",
    daysRemaining: 400,
    status: "valid" as const,
    warningThresholdDays: 30,
  }),
};

const clients: Client[] = [];

afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.close()));
});

/** An MCP client connected in-process to the full server, with AFIP mocked. */
export async function connectClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(validCertificate).connect(serverTransport);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await client.connect(clientTransport);
  clients.push(client);
  return client;
}

/** Parses the JSON text block of a tool result. */
export const textOf = (result: unknown, index = 0) =>
  JSON.parse((result as { content: Array<{ text: string }> }).content[index].text);
