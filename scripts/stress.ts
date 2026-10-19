import { CATEGORY_IDS, type CategoryId } from "../src/lib/generator/types";
import { CATEGORY_CONTENT } from "../src/content";
import { generateProject } from "../src/lib/generator/engine";
import { resolveQuestions } from "../src/lib/generator/questions";
import { createRng } from "../src/lib/generator/randomizer";
import { validateProject } from "../src/lib/generator/validators";

function randomAnswers(category: CategoryId, seed: string, tool?: string) {
  const rng = createRng(seed);
  const questions = resolveQuestions(category, {}, tool, seed);
  const answers: Record<string, string | string[]> = {};
  for (const q of questions) {
    if (q.type === "single") {
      answers[q.id] = rng.pick(q.options).id;
    } else {
      const count = Math.min(q.max ?? 3, q.options.length);
      answers[q.id] = rng.shuffle(q.options).slice(0, Math.max(q.min ?? 1, count)).map((o) => o.id);
    }
  }
  return answers;
}

let total = 0, empty = 0, invalid = 0;
const names = new Set<string>();
for (const category of CATEGORY_IDS) {
  const content = CATEGORY_CONTENT[category];
  let catEmpty = 0;
  for (let i = 0; i < 250; i++) {
    const seed = `${category}-${i}`;
    const answers = randomAnswers(category, seed);
    try {
      const p = generateProject({ category, answers, seed });
      total++;
      names.add(p.name);
      const v = validateProject(p);
      if (!v.ok) { invalid++; if (invalid < 6) console.log("INVALID", category, i, v.errors.slice(0,4)); }
      const text = JSON.stringify(p);
      if (/\{\{|undefined|NaN/.test(text)) { empty++; if (empty < 6) console.log("PLACEHOLDER", category, text.match(/\{\{[^}]+\}\}/)?.[0]); }
    } catch (e) {
      invalid++;
      if (invalid < 10) console.log("ERROR", category, i, (e as Error).message.slice(0, 200));
    }
  }
  console.log(category.padEnd(10), "questions:", content.questions.length, "tools:", content.tools.length, "empty:", catEmpty);
}
console.log({ total, uniqueNames: names.size, empty, invalid });
for (const category of CATEGORY_IDS) {
  const tool = CATEGORY_CONTENT[category].tools[0];
  const answers = randomAnswers(category, `tool-${category}`, tool.id);
  try {
    const p = generateProject({ category, answers, seed: `tool-${category}`, tool: tool.id });
    console.log("tool ok", category, tool.id, p.extras.length);
  } catch (e) { console.log("TOOL ERROR", category, tool.id, (e as Error).message.slice(0,200)); }
}
