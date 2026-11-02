import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MCPResponse } from "../core/types.js";
import { createCatalogTool, resetCatalogCaches } from "./catalogToolFactory.js";

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
    expect(tool.metadata.description).toBe("Obtiene los tipos de prueba disponibles.");
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
    expect(response.structuredContent).toEqual({ items: [{ Id: 1 }] });
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

  it("short-circuits when a guard returns a response", async () => {
    const guardedFetcher = vi.fn();
    const guardedTool = createCatalogTool({
      name: "guarded_tool",
      title: "Guarded tool",
      description: "Tool with a dev guard.",
      guard: () => ({
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Guarded" }, null, 2),
          },
        ],
      }),
      fetcher: guardedFetcher,
    });

    const response = await guardedTool.execute();

    expect(response.isError).toBeUndefined();
    expect(JSON.parse(response.content[0].text)).toEqual({ message: "Guarded" });
    expect(guardedFetcher).not.toHaveBeenCalled();
  });

  it("merges extra error payload fields", async () => {
    const noteFetcher = vi.fn().mockRejectedValueOnce(new Error("AFIP down"));
    const noteTool = createCatalogTool({
      name: "noted_tool",
      title: "Noted tool",
      description: "Tool with an extra error note.",
      fetcher: noteFetcher,
      onError: () => ({ note: "Use point 1" }),
    });

    const response = await noteTool.execute();

    const parsed = JSON.parse(response.content[0].text);
    expect(parsed).toMatchObject({
      error: "AFIP down",
      note: "Use point 1",
    });
  });

  it("handles non-Error rejections gracefully", async () => {
    fetcher.mockRejectedValueOnce("raw string error");

    const response = await tool.execute();

    expect(response.isError).toBe(true);
    const parsed = JSON.parse(response.content[0].text);
    expect(parsed.error).toBe("raw string error");
    expect(parsed.kind).toBe("internal");
    expect(parsed.details).toBe("raw string error");
  });

  it("passes through falsy but valid fetcher results", async () => {
    fetcher.mockResolvedValueOnce(null);

    const response = await tool.execute();

    expect(response.isError).toBeUndefined();
    expect(JSON.parse(response.content[0].text)).toBeNull();
  });
});

describe("createCatalogTool cache", () => {
  const TTL_MS = 24 * 60 * 60 * 1000;
  let clock = 0;
  const now = () => clock;

  beforeEach(() => {
    clock = 0;
    resetCatalogCaches();
  });

  function cachedTool(fetcher: () => Promise<unknown>, guard?: () => MCPResponse | null) {
    return createCatalogTool({
      name: "get_cached_types",
      title: "Cached",
      description: "Cached catalog.",
      fetcher,
      guard,
      cacheTtlMs: TTL_MS,
      now,
    });
  }

  it("serves repeated calls within the TTL from one AFIP request", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ Id: 1 }]);
    const tool = cachedTool(fetcher);

    const first = await tool.execute();
    clock = TTL_MS - 1;
    const second = await tool.execute();

    expect(fetcher).toHaveBeenCalledOnce();
    expect(second).toEqual(first);
    expect(JSON.parse(second.content[0].text)).toEqual([{ Id: 1 }]);
  });

  it("shares one AFIP request between concurrent calls", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ Id: 1 }]);
    const tool = cachedTool(fetcher);

    const [first, second] = await Promise.all([tool.execute(), tool.execute()]);

    expect(fetcher).toHaveBeenCalledOnce();
    expect(second).toEqual(first);
  });

  it("fetches again once the TTL expires", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce([{ Id: 1 }])
      .mockResolvedValueOnce([{ Id: 2 }]);
    const tool = cachedTool(fetcher);

    await tool.execute();
    clock = TTL_MS;
    const refreshed = await tool.execute();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(refreshed.content[0].text)).toEqual([{ Id: 2 }]);
  });

  it("does not cache failures", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("AFIP down"))
      .mockResolvedValueOnce([{ Id: 1 }]);
    const tool = cachedTool(fetcher);

    const failed = await tool.execute();
    const recovered = await tool.execute();

    expect(failed.isError).toBe(true);
    expect(JSON.parse(failed.content[0].text).error).toBe("AFIP down");
    expect(recovered.isError).toBeUndefined();
    expect(JSON.parse(recovered.content[0].text)).toEqual([{ Id: 1 }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("checks the guard before the cache", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ Id: 1 }]);
    let guarded = false;
    const tool = cachedTool(fetcher, () =>
      guarded ? { content: [{ type: "text" as const, text: '{"message":"Guarded"}' }] } : null,
    );

    await tool.execute();
    guarded = true;
    const response = await tool.execute();

    expect(JSON.parse(response.content[0].text)).toEqual({ message: "Guarded" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("fetches on every call when no TTL is configured", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ Id: 1 }]);
    const tool = createCatalogTool({ name: "x", title: "x", description: "x", fetcher });

    await tool.execute();
    await tool.execute();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("forgets cached catalogs on reset", async () => {
    const fetcher = vi.fn().mockResolvedValue([{ Id: 1 }]);
    const tool = cachedTool(fetcher);

    await tool.execute();
    resetCatalogCaches();
    await tool.execute();

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
