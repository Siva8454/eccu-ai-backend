const fs = require("fs");
const path = require("path");

const KNOWLEDGE_STORE_PATH = path.join(
  __dirname,
  "../data/knowledgeStore.json"
);

/**
 * Main search function
 */
function searchKnowledge(query) {
  if (!query || typeof query !== "string") {
    return null;
  }

  const store = JSON.parse(
    fs.readFileSync(KNOWLEDGE_STORE_PATH, "utf8")
  );

  const normalizedQuery = normalize(query);

  /* ---------------- 1. RULE MATCH (highest priority) ---------------- */

  const ruleMatch = store.rules?.find(rule =>
    normalizedQuery.includes(normalize(rule.trigger))
  );

  if (ruleMatch) {
    return {
      type: "rule",
      answer: ruleMatch.response,
      confidence: 0.95
    };
  }

  /* ---------------- 2. CONTENT SEARCH ---------------- */

  let matches = [];

  for (const course of store.courses) {
    for (const module of course.modules) {
      for (const item of module.items) {
        const score = calculateScore(
          normalizedQuery,
          item
        );

        if (score > 0) {
          matches.push({
            courseId: course.courseId,
            courseName: course.courseName,
            moduleName: module.moduleName,
            title: item.title,
            content: item.content,
            score
          });
        }
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  // Sort by best score
  matches.sort((a, b) => b.score - a.score);

  const best = matches[0];

  return {
    type: "content",
    answer: formatAnswer(best),
    confidence: Math.min(0.9, best.score / 10)
  };
}

/* ---------------- Helpers ---------------- */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

function calculateScore(query, item) {
  let score = 0;

  const title = normalize(item.title);
  const content = normalize(item.content || "");
  const tags = (item.tags || []).map(normalize);

  // Title match (strong)
  if (title.includes(query)) score += 5;

  // Tag matches (medium)
  for (const tag of tags) {
    if (query.includes(tag) || tag.includes(query)) {
      score += 3;
    }
  }

  // Content match (weak)
  if (content.includes(query)) score += 2;

  return score;
}

function formatAnswer(result) {
  return `
${result.title}

${result.content}

Source:
${result.courseName} → ${result.moduleName}
`.trim();
}

module.exports = {
  searchKnowledge
};
