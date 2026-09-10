import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./paginate";

function fakeTable(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ i }));
  const calls: Array<[number, number]> = [];
  const build = (from: number, to: number) => {
    calls.push([from, to]);
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
  };
  return { build, calls };
}

describe("fetchAllRows", () => {
  it("lê todas as páginas até o fim", async () => {
    const t = fakeTable(2500);
    const out = await fetchAllRows(t.build, { pageSize: 1000 });
    expect(out).toHaveLength(2500);
    expect(t.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("faz uma única leitura quando a primeira página não enche", async () => {
    const t = fakeTable(10);
    const out = await fetchAllRows(t.build, { pageSize: 1000 });
    expect(out).toHaveLength(10);
    expect(t.calls).toHaveLength(1);
  });

  it("respeita o teto de segurança", async () => {
    const t = fakeTable(10_000);
    const out = await fetchAllRows(t.build, { pageSize: 1000, maxRows: 2000 });
    expect(out).toHaveLength(2000);
    expect(t.calls).toHaveLength(2);
  });

  it("propaga o erro da consulta", async () => {
    await expect(
      fetchAllRows(() => Promise.resolve({ data: null, error: { message: "falhou" } })),
    ).rejects.toEqual({ message: "falhou" });
  });
});
