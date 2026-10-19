import { describe, expect, it } from "vitest";
import { generateProject } from "@/lib/generator/engine";
import { validateProject } from "@/lib/generator/validators";
import { CATEGORY_IDS } from "@/lib/generator/types";

const PLACEHOLDER = /\{\{|\bundefined\b|\bNaN\b|:null[,}]/;

describe("diversity", () => {
  it("generates hundreds of distinct, valid projects across all categories", () => {
    const names = new Set<string>();
    const fingerprints = new Set<string>();
    let total = 0;

    for (const category of CATEGORY_IDS) {
      for (let index = 0; index < 120; index += 1) {
        const project = generateProject(
          { category, answers: {}, seed: `${category}-diversity-${index}` },
          { createdAt: "2026-01-01T00:00:00.000Z" },
        );
        total += 1;
        const check = validateProject(project);
        expect(check.ok, `${category} #${index}: ${check.errors.join(", ")}`).toBe(true);
        const raw = JSON.stringify(project);
        expect(PLACEHOLDER.test(raw), `${category} #${index} leaked a placeholder`).toBe(false);
        names.add(project.name.toLowerCase());
        fingerprints.add(project.fingerprint);
      }
    }

    expect(total).toBe(CATEGORY_IDS.length * 120);
    expect(fingerprints.size).toBe(total);
    expect(names.size / total).toBeGreaterThan(0.6);
  });

  it("keeps names distinct when history is supplied", () => {
    const history: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < 60; index += 1) {
      const project = generateProject(
        { category: "creative", answers: {}, seed: `history-${index}` },
        { createdAt: "2026-01-01T00:00:00.000Z", avoidNames: history },
      );
      expect(seen.has(project.name.toLowerCase())).toBe(false);
      seen.add(project.name.toLowerCase());
      history.push(project.name);
    }
  });
});
