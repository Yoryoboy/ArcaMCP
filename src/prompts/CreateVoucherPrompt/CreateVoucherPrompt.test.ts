import { describe, expect, it } from "vitest";
import { getCompleter } from "@modelcontextprotocol/sdk/server/completable.js";
import { CreateVoucherPrompt } from "./CreateVoucherPrompt.js";
import { CreateVoucherPromptArgsSchema } from "./CreateVoucherPrompt.schemas.js";

function requiredCompleter<T extends Parameters<typeof getCompleter>[0]>(field: T) {
  const completer = getCompleter(field);

  if (!completer) {
    throw new Error("Expected completer to be defined");
  }

  return completer;
}

describe("CreateVoucherPrompt", () => {
  it("builds the prompt with normalized default numbering mode", () => {
    const result = CreateVoucherPrompt.build({ tipoComprobante: "11" });
    const message = result.messages[0];

    expect(message.role).toBe("user");
    expect(message.content.text).toContain('"tipoComprobante": "11"');
    expect(message.content.text).toContain('"modoNumeracion": "automatico"');
    expect(message.content.text).toContain("create_next_voucher");
  });

  it("preserves an explicit manual numbering mode", () => {
    const result = CreateVoucherPrompt.build({ modoNumeracion: "manual" });

    expect(result.messages[0].content.text).toContain('"modoNumeracion": "manual"');
    expect(result.messages[0].content.text).toContain("create_voucher");
  });

  it.each([
    [{ modoNumeracion: "" }, '"modoNumeracion": "automatico"'],
    [{ modoNumeracion: 1 }, '"modoNumeracion": "automatico"'],
  ])("falls back to automatic numbering for non-usable inputs", (args, expectedMode) => {
    const result = CreateVoucherPrompt.build(args);

    expect(result.messages[0].content.text).toContain(expectedMode);
    expect(result.messages[0].content.text).toContain("create_next_voucher");
  });

  it("builds safely when prompt args are omitted entirely", () => {
    const result = CreateVoucherPrompt.build(undefined as unknown as Record<string, unknown>);

    expect(result.messages[0].content.text).toContain("Argumentos recibidos (opcionales):");
    expect(result.messages[0].content.text).toContain("{}\n\nArgumentos normalizados");
    expect(result.messages[0].content.text).toContain('"modoNumeracion": "automatico"');
  });

  it("offers completable suggestions from prompt args context", async () => {
    const tipoComprobanteField = CreateVoucherPromptArgsSchema.shape.tipoComprobante.unwrap();
    const cotizacionField = CreateVoucherPromptArgsSchema.shape.cotizacion.unwrap();
    const importeTotalField = CreateVoucherPromptArgsSchema.shape.importeTotal.unwrap();

    expect(
      requiredCompleter(tipoComprobanteField)("", { arguments: { concepto: "1" } }),
    ).toEqual(["11", "6", "1"]);

    expect(
      requiredCompleter(cotizacionField)("", { arguments: { moneda: "PES" } }),
    ).toEqual(["1"]);

    expect(
      requiredCompleter(importeTotalField)("", {
        arguments: {
          tipoComprobante: "11",
          importeNeto: "100",
          importeTributos: "5",
        },
      }),
    ).toEqual(["105"]);
  });
});
