import { describe, expect, it } from "vitest";
import { createRng, hashString, weightedPick, weightedSample, clamp } from "@/lib/generator/randomizer";

describe("randomizer", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng("ideaforge");
    const b = createRng("ideaforge");
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng("seed-a");
    const b = createRng("seed-b");
    expect(a.next()).not.toBe(b.next());
  });

  it("hashes consistently", () => {
    expect(hashString("abc")).toBe(hashString("abc"));
    expect(hashString("abc")).not.toBe(hashString("abd"));
  });

  it("shuffles without losing items", () => {
    const rng = createRng("shuffle");
    const input = ["a", "b", "c", "d", "e"];
    const output = rng.shuffle(input);
    expect(output).toHaveLength(input.length);
    expect([...output].sort()).toEqual([...input].sort());
    expect(input).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("respects weights", () => {
    const rng = createRng("weights");
    const items = [
      { id: "rare", weight: 0.001 },
      { id: "common", weight: 1000 },
    ];
    const picks = Array.from({ length: 100 }, () => weightedPick(rng, items)?.id);
    expect(picks.filter((id) => id === "common").length).toBeGreaterThan(95);
  });

  it("samples without replacement", () => {
    const rng = createRng("sample");
    const items = Array.from({ length: 10 }, (_, index) => ({ id: String(index), weight: 1 }));
    const sample = weightedSample(rng, items, 4);
    expect(sample).toHaveLength(4);
    expect(new Set(sample.map((item) => item.id)).size).toBe(4);
  });

  it("clamps", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
