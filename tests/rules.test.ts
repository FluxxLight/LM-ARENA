import { describe, expect, it } from "vitest";
import { applyRules, collectTags, scoreContent } from "@/lib/generator/rules";
import type { ContentItem, Question } from "@/lib/generator/types";

const question: Question = {
  id: "genre",
  prompt: "Gênero?",
  type: "single",
  options: [
    { id: "horror", label: "Terror", tags: ["horror", "dark"] },
    { id: "cozy", label: "Cozy", tags: ["cozy", "light"] },
  ],
};

describe("rules", () => {
  it("collects tags from answers", () => {
    expect(collectTags({ genre: "horror" }, [question]).sort()).toEqual(["dark", "horror"]);
  });

  it("accumulates boosts when rules fire", () => {
    const effect = applyRules(["horror", "dark"], [
      { id: "r1", when: ["horror"], boost: { dark: 2 } },
      { id: "r2", when: ["horror", "dark"], boost: { tension: 3 } },
      { id: "r3", when: ["cozy"], boost: { calm: 5 } },
    ]);
    expect(effect.boost.dark).toBe(2);
    expect(effect.boost.tension).toBe(3);
    expect(effect.boost.calm).toBeUndefined();
    expect(effect.fired).toEqual(["r1", "r2"]);
  });

  it("forbids content carrying forbidden tags", () => {
    const effect = applyRules(["horror"], [{ id: "no-cute", when: ["horror"], forbid: ["cute"] }]);
    const cute: ContentItem = { id: "c1", text: "Cute text", tags: ["cute"] };
    const grim: ContentItem = { id: "c2", text: "Grim text", tags: ["horror"] };
    expect(scoreContent(cute, new Set(["horror"]), effect)).toBeNull();
    expect(scoreContent(grim, new Set(["horror"]), effect)).toBeGreaterThan(0);
  });

  it("scores affinity higher than an unrelated item", () => {
    const effect = applyRules([], []);
    const tags = new Set(["horror", "dark"]);
    const related: ContentItem = { id: "a", text: "x", tags: ["horror", "dark"] };
    const unrelated: ContentItem = { id: "b", text: "y", tags: ["cozy"] };
    expect(scoreContent(related, tags, effect)!).toBeGreaterThan(scoreContent(unrelated, tags, effect)!);
  });
});
