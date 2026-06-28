import { describe, expect, it, vi } from "vitest";
import { createCatalogTool } from "./catalogToolFactory.js";

describe("createCatalogTool", () => {
  const fetcher = vi.fn();

  const tool = createCatalogTool({
    name: "get_test_types",
    title: "Obtener tipos de prueba",
    description: "Obtiene los tipos de prueba disponibles.",
    fetcher,
  });

  it("exposes name, metadata, and execute", () => {
    expect(tool.name).toBe("get_test_types");
    expect(tool.metadata.title).toBe("Obtener tipos de prueba");
    expect(tool.metadata.description).toBe(
      "Obtiene los tipos de prueba disponibles.",
    );
    expect(tool.metadata.inputSchema).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });

  it("produces a valid MCPResponse on success", async () => {
    fetcher.mockResolvedValueOnce([{ Id: 1 }]);

    const response = await tool.execute();

    expect(response.isError).toBeUndefined();
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    expect(JSON.parse(response.content[0].text)).toEqual([{ Id: 1 }]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("produces an error MCPResponse on failure", async () => {
    fetcher.mockRejectedValueOnce(new Error("AFIP down"));

    const response = await tool.execute();

    expect(response.isError).toBe(true);
    expect(response.content).toHaveLength(1);
    expect(response.content[0].type).toBe("text");
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toBe("AFIP down");
  });

  it("handles non-Error rejections gracefully", async () => {
    fetcher.mockRejectedValueOnce("raw string error");

    const response = await tool.execute();

    expect(response.isError).toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toBe("Error desconocido");
    expect(parsed.details).toBe("raw string error");
  });

  it("passes through falsy but valid fetcher results", async () => {
    fetcher.mockResolvedValueOnce(null);

    const response = await tool.execute();

    expect(response.isError).toBeUndefined();
    expect(JSON.parse(response.content[0].text)).toBeNull();
  });
});
