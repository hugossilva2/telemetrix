import { beforeEach, describe, expect, it } from "vitest";
import { notifyOncePerDay } from "./dailyOnce";

describe("notifyOncePerDay", () => {
  beforeEach(() => window.localStorage.clear());

  it("libera o aviso na primeira vez e suprime na segunda", () => {
    expect(notifyOncePerDay("store:v1", "oleo")).toBe(false);
    expect(notifyOncePerDay("store:v1", "oleo")).toBe(true);
  });

  it("trata itens diferentes de forma independente", () => {
    expect(notifyOncePerDay("store:v1", "oleo")).toBe(false);
    expect(notifyOncePerDay("store:v1", "pneus")).toBe(false);
  });

  it("separa por chave de armazenamento", () => {
    expect(notifyOncePerDay("a:v1", "x")).toBe(false);
    expect(notifyOncePerDay("b:v1", "x")).toBe(false);
  });

  it("suprime quando o conteúdo salvo está corrompido", () => {
    window.localStorage.setItem("store:v1", "{{{");
    expect(notifyOncePerDay("store:v1", "oleo")).toBe(true);
  });
});
