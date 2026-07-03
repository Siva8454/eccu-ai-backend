require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");
const fs = require("fs");

console.log("QDRANT_URL:", process.env.QDRANT_URL);
console.log("QDRANT_API_KEY:", process.env.QDRANT_API_KEY ? "FOUND" : "MISSING");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge_v7";

// ADD HELPER HERE
function shouldSkipContent(text = "") {

  const lower = text.toLowerCase();

  if (
  text.includes("EC-Council University (ECCU)") &&
  text.includes("Module 01") &&
  text.includes("Module 10")
) {
  console.log("Skipping navigation page");
 return true;
}

  // IMAGE / ICON FILES
  if (
    lower.endsWith(".svg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.includes("play_video") ||
    lower.includes("objective_m") ||
    lower.includes("modules_w")
  ) {
    return true;
  }

  // MODULE WRAPPERS
  if (
    lower.includes("learning materials activity time") ||
    lower.includes("please complete - course survey") ||
    lower.includes("access the written assignment") ||
    lower.includes("access the discussion") ||
    lower.includes("access the quiz") ||
    lower.includes("access the live session") ||
    lower.includes("certification exam study resources") ||
    lower.includes("total estimated time")
  ) {
    return true;
  }

  // ASSIGNMENT / DISCUSSION GARBAGE
  if (
    lower.includes("upload your file") ||
    lower.includes("submit your assignment") ||
    lower.includes("reply to at least") ||
    lower.includes("post early in the week") ||
    lower.includes("discussion rubric") ||
    lower.includes("minimum word count") ||
    lower.includes("maintain a respectful") ||
    lower.includes("discussion contributes") ||
    lower.includes("late submissions") ||
    lower.includes("apa formatting") ||
    lower.includes("apa paper") ||
    lower.includes("turnitin") ||
    lower.includes("grammarly") ||
    lower.includes("citation") ||
    lower.includes("plagiarism") ||
    lower.includes("reply to classmates") ||
    lower.includes("substantive response") ||
    lower.includes("initial response") ||
    lower.includes("discussion thread") ||
    lower.includes("engage reply") ||
    lower.includes("discussion prompt") ||
    lower.includes("respond to peers") ||
    lower.includes("respectful and inclusive") ||
    lower.includes("research topic") ||
    lower.includes("share your refined topic")
  ) {
    return true;
  }

  // SYSTEM / FOOTER GARBAGE
  if (
    lower.includes("all rights reserved") ||
    lower.includes("copyright") ||
    lower.includes("support center") ||
    lower.includes("course issues") ||
    lower.includes("write to us") ||
    lower.includes("home instructor syllabus") ||
    lower.includes("canvas student android guide")
  ) {
    return true;
  }

  // TOO MANY MODULE REFERENCES
  if (
    (lower.match(/module\s\d+/g) || []).length > 5
  ) {
    return true;
  }

  return false;
}

async function indexKnowledgeStore() {
  const store = JSON.parse(
    fs.readFileSync("./data/knowledge-store.json", "utf-8")
  );

  console.log(
  store.courses.filter(
    c =>
      c.id === 2213 ||
      c.id === 2360
  )
);

process.exit();
  // Create collection if not exists
  try {
  await qdrant.getCollection(COLLECTION);
  console.log("📦 Collection already exists");
} catch {
  console.log("📦 Creating collection...");

  await qdrant.createCollection(COLLECTION, {
    vectors: {
      size: 384,
      distance: "Cosine"
    }
  });

  console.log("✅ Collection created");
}

// ALWAYS ENSURE INDEX EXISTS
try {
  await qdrant.createPayloadIndex(COLLECTION, {
    field_name: "courseId",
    field_schema: "integer"
  });

  console.log("✅ courseId index created");
} catch (err) {
  console.log("ℹ️ Index may already exist");
}

  const points = [];
  let id = 1;

  store.courses.forEach(course => {
    (course.modules || []).forEach(module => {
      console.log(module);
      const items = module.items || module.moduleItems || [];
      console.log(module);

      items.forEach(item => {
        if (!item.title && !item.name) return;

        const title = item.title || item.name;

        const rawContent =
          item.content ||
          item.body ||
          item.description ||
          "";

        // CLEAN HTML + CANVAS GARBAGE
          const content = String(rawContent)

        // decode slashes
        .replace(/\\\\/g, " ")

        // remove escaped quotes
        .replace(/\\"/g, " ")

        // remove unicode html chars
        .replace(/\\u003c/g, " ")
        .replace(/\\u003e/g, " ")

        // remove ALL html tags
        .replace(/<[^>]+>/g, " ")

        // remove href/src junk
        .replace(/href=.*?(?=\s|$)/g, " ")
        .replace(/src=.*?(?=\s|$)/g, " ")

        // remove canvas attributes
        .replace(/class=.*?(?=\s|$)/g, " ")
        .replace(/data-api-.*?(?=\s|$)/g, " ")
        .replace(/loading=.*?(?=\s|$)/g, " ")

        // remove file/image leftovers
        .replace(/\bFile\b/g, " ")
        .replace(/img/g, " ")

        // remove URLs
        .replace(/https?:\/\/\S+/g, " ")

        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/[_=]{2,}/g, " ")

        // html entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")

        // normalize spaces
        .replace(/\s+/g, " ")

        .trim();

        if (shouldSkipContent(content)) {
        return;
      }

      if (!content || content.length < 150) {
        return;
      }

        const type = item.type || "content";

        const pageUrl =
          item.html_url ||
          item.url ||
          "";

        const text = [
          title,
          module.moduleName,
          content
        ]
        .filter(Boolean)
        .join("\n\n");

        const lower =
  content.toLowerCase();

    const badPatterns = [

      "copyright",
      "all rights reserved",
      "submit your discussion",
      "reply",
      "discussion comments",
      "discussion prompt",
      "post a full and complete initial response",
      "click the end button",
      "live session",
      "home instructor syllabus",
      "canvas student android guide",
      "helpful video",
      "apa paper template",
      "apa sample paper",
      "in-text citation",
      "grammarly",
      "turnitin",
      "reproduction is strictly prohibited",
      "syllabus",
      "course overview",
      "student guide",
      "academic integrity",
      "late submission",
      "netiquette",
      "attendance policy",
      "grading policy",
      "weekly objectives"

    ];

    const isBadContent =
      badPatterns.some(pattern =>
        lower.includes(pattern)
      );

    // SKIP BAD CONTENT
    if (
      !content ||
      content.length < 150 ||
      isBadContent
    ) {
      return;
    }

    // FILTER LOW VALUE DISCUSSIONS
      if (
        type === "discussion" &&
        (
          lower.includes("reply to") ||
          lower.includes("post your response") ||
          lower.includes("minimum word count") ||
          lower.includes("discussion rubric")
        )
      ) {
        return;
      }

      // FILTER LOW VALUE ASSIGNMENTS
      if (
        type === "assignment" &&
        (
          lower.includes("submit assignment") ||
          lower.includes("upload your file") ||
          lower.includes("due date")
        )
      ) {
        return;
      }

      // SKIP QUIZZES
      if (type === "quiz") {
        return;
      }

        points.push({
          id: id++,
          payload: {

          // Course Info
          courseId: Number(course.courseId),
          courseName: course.courseName,
          courseCode: course.courseCode || "",

          // Module Info
          moduleName: module.moduleName,
          moduleNumber: module.moduleNumber || "",

          // Content Info
          type,
          title,
          content,

          // NEW METADATA
          itemId: item.id || "",
          published: item.published || false,
          position: item.position || 0,

          // Navigation
          pageUrl,

          // Source Info
          source: "canvas",

          indexedAt: new Date().toISOString()
        },

          text
        });
      });
    });
  });

  console.log("📚 Courses:", store.courses.length);

  store.courses.forEach(c => {
    console.log("📘 Course:", c.courseName);
  });

  console.log("🧠 Creating embeddings...");

  const vectors = [];

  for (const p of points) {
    const embedding = await getLocalEmbedding(p.text);

    vectors.push({
      id: p.id,
      vector: embedding,
      payload: p.payload
    });
  }

  console.log("⬆ Uploading vectors to Qdrant...");

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: vectors
  });

  console.log("🚀 Vector indexing complete");
}

if (require.main === module) {
  indexKnowledgeStore()
    .then(() => console.log("Done"))
    .catch(console.error);
}

module.exports = { indexKnowledgeStore };