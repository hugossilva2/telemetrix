import { describe, expect, it } from "vitest";
import { localDayKey } from "@/lib/format";

describe("localDayKey", () => {
  it("usa o dia do fuso local, não o de Greenwich", () => {
    const d = new Date(2026, 8, 9, 23, 30); // 9/9 às 23h30 local
    expect(localDayKey(d)).toBe("2026-09-09");
  });

  it("aceita texto ISO e devolve vazio em data inválida", () => {
    expect(localDayKey(new Date(2026, 0, 1, 8).toISOString())).toBe("2026-01-01");
    expect(localDayKey("nada")).toBe("");
  });
});
