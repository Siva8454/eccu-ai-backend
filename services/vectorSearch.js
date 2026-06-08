const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");


const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge_v7";

/* ---------------- MODULE DETECTOR ---------------- */

function detectModuleNumber(question) {
  const match = question.match(/module\s*0*(\d+)/i);
  if (match) return Number(match[1]);
  return null;
}

/* ---------------- COURSE CODE DETECTOR ---------------- */

function detectCourseCode(question) {
  const match = question.match(/[A-Z]{2,5}\s?\d{3}/i);

  if (match) {
    return match[0].toUpperCase().replace(/\s+/, " ");
  }

  return null;
}

/* -------------------------------------------------- */
/* MAIN VECTOR SEARCH */
/* -------------------------------------------------- */

async function vectorSearch(
  question,
  allowedCourseIds = [],
  intent,
  currentPage
) {

  console.log("🔎 Vector search:", question);
  console.log("📄 Current Page:", currentPage);

  console.log("📄 VECTOR INPUT SAMPLE:");
console.log(question.slice(0, 3000));

  const embedding = await getLocalEmbedding(question);

  /* ---------------- BASE FILTER ---------------- */

  const filter = undefined;

  /* -------------------------------------------------- */
  /* VECTOR SEARCH (DEEP SEARCH) */
  /* -------------------------------------------------- */

  let results = await client.search(COLLECTION, {
    vector: embedding,
    limit: 20, // ⭐ deeper search
  });

  if (!results.length) {
    console.log("❌ No results found in vector DB");
    return null;
  }

  console.log("Raw results:", results.length);

  // ✅ Manual course filtering (since Qdrant index not available)
if (allowedCourseIds.length) {

  console.log("BEFORE FILTER:", results.length);

  results = results.filter(r => {

    const match =
      allowedCourseIds.includes(r.payload.courseId);

    console.log(
      "VECTOR COURSE:",
      r.payload.courseId,
      "MATCH:",
      match
    );

    return match;

  });

  console.log("AFTER FILTER:", results.length);

}

console.log("Filtered results:", results.length);

  /* -------------------------------------------------- */
  /* BOOSTING LOGIC (VERY IMPORTANT) */
  /* -------------------------------------------------- */

  results = results.map(r => {

    let score = r.score;
    const p = r.payload;

    /* ⭐ PRIORITY 1 — CURRENT PAGE MATCH */

        if (
    currentPage?.url &&
    p.pageUrl &&
    currentPage.url === p.pageUrl
  ){
      score += 0.4;
    }

    /* ⭐ PRIORITY 2 — MODULE MATCH */

    if (
      p.moduleName &&
      question.toLowerCase().includes(p.moduleName.toLowerCase())
    ) {
      score += 0.2;
    }

    /* ⭐ PRIORITY 3 — TITLE MATCH */

    if (
      p.title &&
      question.toLowerCase().includes(p.title.toLowerCase())
    ) {
      score += 0.2;
    }

    /* ⭐ PRIORITY 4 — CURRENT PAGE TITLE */

      if (
        currentPage?.title &&
        p.title &&
        currentPage.title
          .toLowerCase()
          .includes(p.title.toLowerCase())
      ) {
        score += 0.35;
      }

    return {
      ...r,
      boostedScore: score
    };

  });

  /* -------------------------------------------------- */
  /* SORT BY BOOSTED SCORE */
  /* -------------------------------------------------- */

  results.sort((a, b) => b.boostedScore - a.boostedScore);

  /* -------------------------------------------------- */
  /* TAKE TOP RESULTS */
  /* -------------------------------------------------- */

  const topResults = results
  .filter(r => r.boostedScore > 0.7)
  .slice(0, 3);

  /* -------------------------------------------------- */
  /* BUILD CONTEXT */
  /* -------------------------------------------------- */

  const context = topResults.map(r => {

    const p = r.payload;

    const links = (p.links || [])
      .map(l => `${l.text} → ${l.url}`)
      .join("\n\n----------------\n\n");

    return `

Course: ${p.courseName}

Module: ${p.moduleName || "N/A"}

Title: ${p.title || ""}

Content:
${(p.content || "").slice(0, 1200)}

Resources:
${links}

Type: ${p.type}
`;

  }).join("\n\n----------------\n\n");

  console.log("Final context size:", context.length);

  return {
  context,
  confidence: topResults[0].boostedScore,
  rawScore: topResults[0].score
};

}

module.exports = { vectorSearch };