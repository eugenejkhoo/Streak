import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adultForm,
  exploresOvernight,
  rollHatch,
  vitality,
  vitalityBand,
} from "../supabase/functions/_shared/resolve.ts";

const rep = (n: number, v: number) => Array.from({ length: n }, () => v);

test("spec worked examples (docs/03 section 4.2)", () => {
  assert.equal(vitality(rep(14, 100), false), 100);
  assert.equal(vitality([...rep(7, 90), ...rep(7, 65)], false), 78);
  assert.equal(vitality([...rep(13, 100), 30], false), 95);
  // 9 both-fed (~76) + 5 one-fed (20) -> 56
  assert.equal(vitality([...rep(9, 76), ...rep(5, 20)], false), 56);
});

test("new egg starts at the 70 prior and converges", () => {
  assert.equal(vitality([], false), 70);
  assert.equal(vitality([100], false), 72);
  assert.equal(vitality(rep(7, 100), false), 85);
});

test("only the last 14 scores count", () => {
  assert.equal(vitality([...rep(30, 0), ...rep(14, 100)], false), 100);
});

test("expedition bonus adds 5 and clamps at 100", () => {
  assert.equal(vitality(rep(14, 80), true), 85);
  assert.equal(vitality(rep(14, 98), true), 100);
});

test("bands", () => {
  assert.equal(vitalityBand(39), "droopy");
  assert.equal(vitalityBand(40), "normal");
  assert.equal(vitalityBand(70), "bright");
  assert.equal(vitalityBand(91), "glowing");
});

test("overnight exploration at score >= 90", () => {
  assert.equal(exploresOvernight(89), false);
  assert.equal(exploresOvernight(90), true);
});

test("adult forms", () => {
  const n = 55;
  const allFed = rep(n, 0).map(() => "both_fed" as const);
  assert.equal(adultForm(rep(n, 90), allFed), "secret");
  assert.equal(adultForm(rep(n, 90), [...allFed.slice(1), "shielded"]), "radiant", "a shield counts as a miss for secret");
  assert.equal(adultForm(rep(n, 70), allFed), "standard");
  assert.equal(adultForm(rep(n, 49), allFed), "scrappy");
  assert.equal(adultForm(rep(n, 85), allFed), "standard", "85 exactly is not over 85");
});

test("hatch roll odds match the table within tolerance", () => {
  // Deterministic LCG so the test is stable.
  let seed = 12345;
  const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const N = 200_000;
  const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  let shiny = 0;
  for (let i = 0; i < N; i++) {
    const r = rollHatch(rng, false);
    counts[r.tier]++;
    if (r.shiny) shiny++;
  }
  const close = (got: number, want: number, tol: number) => assert.ok(Math.abs(got / N - want) < tol, `${got / N} vs ${want}`);
  close(counts.common, 0.6, 0.01);
  close(counts.uncommon, 0.25, 0.01);
  close(counts.rare, 0.12, 0.01);
  close(counts.legendary, 0.03, 0.005);
  close(shiny, 0.01, 0.003);
});

test("lucky egg multiplies rare and legendary by 1.5 and takes it from common", () => {
  let seed = 777;
  const rng = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const N = 200_000;
  const counts: Record<string, number> = { common: 0, uncommon: 0, rare: 0, legendary: 0 };
  for (let i = 0; i < N; i++) counts[rollHatch(rng, true).tier]++;
  assert.ok(Math.abs(counts.rare / N - 0.18) < 0.01);
  assert.ok(Math.abs(counts.legendary / N - 0.045) < 0.005);
  assert.ok(Math.abs(counts.uncommon / N - 0.25) < 0.01);
  assert.ok(Math.abs(counts.common / N - 0.525) < 0.01);
});
