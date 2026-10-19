import { describe, expect, it } from "vitest";
import { PLANS, PASSES, PACKS, GUEST_LIMITS, formatPrice } from "@/config/plans";
import { BADGES, LEVELS, XP_RULES, levelForXp } from "@/config/gamification";
import { CATEGORY_CONTENT } from "@/content";

describe("commercial config", () => {
  it("has nine passes plus free and all access", () => {
    expect(PASSES).toHaveLength(9);
    expect(Object.keys(PLANS)).toHaveLength(11);
    expect(PLANS.all_access.includes).toHaveLength(9);
  });

  it("maps every category to a real pass", () => {
    for (const category of Object.values(CATEGORY_CONTENT)) {
      const pass = PASSES.find((entry) => entry.category === category.id);
      expect(pass, category.id).toBeTruthy();
      expect(PLANS[pass!.key].includes).toContain(pass!.key);
    }
  });

  it("gives paid plans higher limits than free", () => {
    expect(PLANS.games_pass.limits.generationsPerDay).toBeGreaterThan(PLANS.free.limits.generationsPerDay);
    expect(PLANS.all_access.limits.generationsPerDay).toBeGreaterThan(PLANS.games_pass.limits.generationsPerDay);
    expect(GUEST_LIMITS.generationsPerDay).toBeLessThan(PLANS.free.limits.generationsPerDay);
  });

  it("formats prices in BRL", () => {
    expect(formatPrice(1900)).toMatch(/^R\$\s?19/);
    expect(formatPrice(0)).toContain("0");
  });

  it("documents three packs with credits", () => {
    expect(PACKS).toHaveLength(3);
    for (const pack of PACKS) expect(pack.credits).toBeGreaterThan(0);
  });
});

describe("gamification config", () => {
  it("awards XP for create, remix, share and challenge", () => {
    expect(XP_RULES.project_created).toBe(10);
    expect(XP_RULES.remix).toBe(5);
    expect(XP_RULES.share).toBe(10);
    expect(XP_RULES.challenge).toBe(25);
  });

  it("has five levels from Explorer to Visionary", () => {
    expect(LEVELS[0].label).toBe("Explorer");
    expect(LEVELS.at(-1)?.label).toBe("Visionary");
    expect(levelForXp(0).label).toBe("Explorer");
    expect(levelForXp(1500).label).toBe("Visionary");
    expect(levelForXp(100).progress).toBeGreaterThanOrEqual(0);
  });

  it("defines badges with unique keys", () => {
    expect(new Set(BADGES.map((badge) => badge.key)).size).toBe(BADGES.length);
    expect(BADGES.length).toBeGreaterThanOrEqual(6);
  });
});
