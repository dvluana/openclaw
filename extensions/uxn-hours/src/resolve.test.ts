import { describe, expect, it } from "vitest";
import { normalizeSearchText, resolveByName, summarizeMinutes } from "./resolve.js";

describe("UXN Hours name resolution", () => {
  const clients = [
    { id: "1", name: "Loumar Turismo" },
    { id: "2", name: "Loumar Marketing" },
    { id: "3", name: "Retrilhar" },
  ];

  it("normalizes accents and punctuation for matching", () => {
    expect(normalizeSearchText("  Lançamento UX/UI  ")).toBe("lancamento ux ui");
  });

  it("resolves exact and contained names", () => {
    expect(resolveByName(clients, "retrilhar")).toEqual({
      kind: "match",
      value: clients[2],
    });
    expect(resolveByName(clients, "turismo")).toEqual({
      kind: "match",
      value: clients[0],
    });
  });

  it("reports ambiguous matches instead of guessing", () => {
    const match = resolveByName(clients, "loumar");

    expect(match.kind).toBe("ambiguous");
    if (match.kind === "ambiguous") {
      expect(match.matches).toHaveLength(2);
    }
  });

  it("formats durations for WhatsApp responses", () => {
    expect(summarizeMinutes(45)).toBe("45min");
    expect(summarizeMinutes(60)).toBe("1h");
    expect(summarizeMinutes(270)).toBe("4h30");
  });
});
