const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");
const { detectIntent } = require("./intentDetector");
const { rerank } = require("./reranker");

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge";

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

async function vectorSearch(question, allowedCourseIds = []) {

  console.log("🔎 Vector search:", question);

  const intent = detectIntent(question);
  const moduleNumber = detectModuleNumber(question);
  const courseCode = detectCourseCode(question);

  console.log("Intent:", intent);
  console.log("Module:", moduleNumber);
  console.log("Course:", courseCode);

  const embedding = await getLocalEmbedding(question);

  const mustFilters = [];

  /* ---------------- COURSE SECURITY ---------------- */

  if (allowedCourseIds.length) {
    mustFilters.push({
      key: "courseId",
      match: { any: allowedCourseIds }
    });
  }

  /* ---------------- COURSE FILTER ---------------- */

  if (courseCode) {
    mustFilters.push({
      key: "courseName",
      match: { text: courseCode }
    });
  }

  /* ---------------- MODULE FILTER ---------------- */

  if (moduleNumber && moduleNumber > 0) {
    mustFilters.push({
      key: "moduleNumber",
      match: { value: moduleNumber }
    });
  }

  /* ---------------- FILTER BUILD ---------------- */

  const filter = mustFilters.length ? { must: mustFilters } : undefined;

  console.log("Applied filters:", JSON.stringify(filter, null, 2));

  /* -------------------------------------------------- */
  /* VECTOR SEARCH */
  /* -------------------------------------------------- */

  let results = await client.search(COLLECTION, {
    vector: embedding,
    limit: 15,
    filter
  });

  console.log("Vector results:", results.length);

  /* -------------------------------------------------- */
  /* HYBRID FALLBACK */
  /* -------------------------------------------------- */

  if (!results.length) {

    console.log("⚠ No filtered results — running global fallback search");

    results = await client.search(COLLECTION, {
      vector: embedding,
      limit: 15
    });

  }

  if (!results.length) {
    console.log("❌ No results found in vector DB");
    return null;
  }

  /* -------------------------------------------------- */
  /* RERANK RESULTS */
  /* -------------------------------------------------- */

  results = rerank(question, results);

  /* -------------------------------------------------- */
  /* BUILD CONTEXT */
  /* -------------------------------------------------- */

  const context = results.map(r => {

    const p = r.payload;

    const links = (p.links || [])
      .map(l => `${l.text} → ${l.url}`)
      .join("\n\n----------------\n\n");

    return `

Course: ${p.courseName}

Module: ${p.moduleName || "N/A"}

Title: ${p.title || ""}

Content:
${p.content || ""}

Resources:
${links}

Type: ${p.type}
`;

  }).join("\n\n----------------\n\n");

  return {
    context,
    confidence: results[0].score
  };

}

module.exports = { vectorSearch };