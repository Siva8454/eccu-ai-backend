require("dotenv").config();

const { QdrantClient } =
  require("@qdrant/js-client-rest");

const {
  getLocalEmbedding
} = require("./localEmbedding");

/* -------------------------------------------------- */
/* QDRANT CLIENT */
/* -------------------------------------------------- */

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false
});

const COLLECTION = "eccu_knowledge_v7";

console.log("Knowledge builder started...");

/* -------------------------------------------------- */
/* CLEAN CANVAS CONTENT */
/* -------------------------------------------------- */

function cleanCanvasContent(text = "") {

  return String(text)

    // remove escaped quotes
    .replace(/\\"/g, " ")

    // remove escaped newlines
    .replace(/\\n/g, " ")

    // remove unicode html chars
    .replace(/\\u003c/g, " ")
    .replace(/\\u003e/g, " ")

    // remove scripts/styles
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )

    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )

    // remove all html tags
    .replace(/<[^>]*>/g, " ")

    // remove href/src junk
    .replace(/href="[^"]*"/g, " ")
    .replace(/src="[^"]*"/g, " ")

    // remove canvas attributes
    .replace(/class="[^"]*"/g, " ")
    .replace(/style="[^"]*"/g, " ")
    .replace(/loading="[^"]*"/g, " ")

    .replace(
      /data-api-endpoint="[^"]*"/g,
      " "
    )

    .replace(
      /data-api-returntype="[^"]*"/g,
      " "
    )

    // remove urls
    .replace(/https?:\/\/\S+/g, " ")

    // remove file/img leftovers
    .replace(/\bFile\b/g, " ")
    .replace(/\bimg\b/g, " ")

    // html entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')

    // normalize spaces
    .replace(/\s+/g, " ")

    .trim();

}

    /* -------------------------------------------------- */
    /* LOW VALUE CONTENT FILTER */
    /* -------------------------------------------------- */

    function isLowValueContent(text = "") {

      const lower = text.toLowerCase();

      const badPatterns = [

        "copyright",
        "all rights reserved",
        "submit your discussion",
        "discussion comments",
        "post a full and complete initial response",
        "minimum word count",
        "reply to at least",
        "reproduction is strictly prohibited",
        "click the end button",
        "home instructor syllabus",
        "canvas student android guide",
        "helpful video",
        "apa paper template",
        "apa sample paper",
        "in-text citation",
        "grammarly",
        "turnitin",
        "syllabus",
        "course overview",
        "student guide",
        "academic integrity",
        "late submission",
        "netiquette",
        "attendance policy",
        "grading policy",
        "weekly objectives",
        "play_video",
        "objective_m",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        "course issues",
        "help faq",
        "write to us",
        "support center"

      ];

      return badPatterns.some(pattern =>
        lower.includes(pattern)
      );
    }


/* -------------------------------------------------- */
/* EXTRACT LINKS */
/* -------------------------------------------------- */

function extractLinks(html) {

  if (!html) return [];

  const links = [];

  const regex =
    /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html))) {

    links.push({
      url: match[1],

      text: match[2]
        .replace(/<[^>]+>/g, "")
        .trim()
    });

  }

  return links;

}

/* -------------------------------------------------- */
/* ENSURE COLLECTION */
/* -------------------------------------------------- */

async function ensureCollection() {

  try {

    await client.getCollection(COLLECTION);

    console.log(
      "📦 Collection already exists"
    );

  } catch {

    console.log(
      "🆕 Creating Qdrant collection..."
    );

    await client.createCollection(
      COLLECTION,
      {
        vectors: {
          size: 384,
          distance: "Cosine"
        }
      }
    );

    console.log("✅ Collection created");

  }

}

/* -------------------------------------------------- */
/* TEXT CHUNKER */
/* -------------------------------------------------- */

function chunkText(text, size = 1200) {

  if (!text) return [];

  const chunks = [];

  let i = 0;

  while (i < text.length) {

    chunks.push(
      text.slice(i, i + size)
    );

    i += size;

  }

  return chunks;

}

/* -------------------------------------------------- */
/* GENERATE UNIQUE ID */
/* -------------------------------------------------- */

function generateId() {

  return (
    Date.now() +
    Math.floor(Math.random() * 100000)
  );

}

/* -------------------------------------------------- */
/* MODULE NUMBER */
/* -------------------------------------------------- */

function detectModuleNumber(name) {

  if (!name) return null;

  const match =
    name.match(/module\s*0*(\d+)/i);

  if (match) {
    return Number(match[1]);
  }

  return null;

}

/* -------------------------------------------------- */
/* UPSERT VECTOR */
/* -------------------------------------------------- */

async function upsertPoint(
  id,
  embedding,
  payload
) {

  await client.upsert(COLLECTION, {

    wait: true,

    points: [
      {
        id,
        vector: embedding,
        payload
      }
    ]

  });

}

/* -------------------------------------------------- */
/* MAIN BUILDER */
/* -------------------------------------------------- */

async function buildKnowledgeStore(
  canvasData
) {

  await ensureCollection();

  console.log(
    "🚀 Building ECCU vector knowledge..."
  );

  let totalIndexed = 0;

  for (const course of (canvasData || [])) {

    const courseId =
      Number(course.id);

    console.log(
      `📘 Course: ${course.name}`
    );

    /* ================= MODULE ITEMS ================= */

    for (const module of (
      course.modules || []
    )) {

      const moduleNumber =
        detectModuleNumber(
          module.name
        );

      for (const item of (
        module.items || []
      )) {

        const rawContent =
        item.content ||
        item.body ||
        item.description ||
        "";

        const cleanedContent =
          cleanCanvasContent(
            rawContent
          );

          if (
          isLowValueContent(
            cleanedContent
          )
        ) {
          continue;
        }

        const text = [

          item.title,

          cleanedContent

        ]
        .filter(Boolean)
        .join("\n\n");

        // skip garbage chunks
        if (
          !text ||
          text.length < 180
        ) {
          continue;
        }

        const chunks =
          chunkText(text);

        for (const chunk of chunks) {

          const embedding =
            await getLocalEmbedding(
              chunk
            );

          await upsertPoint(

            generateId(),

            embedding,

            {
              type: "module_item",

              courseId,

              courseName:
                course.name,

              moduleName:
                module.name,

              moduleNumber,

              title:
                item.title,

              content:
                chunk
            }

          );

          totalIndexed++;

        }

      }

    }

    /* ================= PAGES ================= */

    for (const page of (
      course.pages || []
    )) {

      const links =
        extractLinks(page.body);

      const cleanedPage =
        cleanCanvasContent(
          page.body || ""
        );

      const text = [

        page.title,

        cleanedPage

      ]
      .filter(Boolean)
      .join("\n\n");

      if (
        !text ||
        text.length < 180
      ) {
        continue;
      }

      const chunks =
        chunkText(text);

      for (const chunk of chunks) {

        const embedding =
          await getLocalEmbedding(
            chunk
          );

        await upsertPoint(

          generateId(),

          embedding,

          {
            type: "page",

            courseId,

            courseName:
              course.name,

            title:
              page.title,

            content:
              chunk,

            links,

            pageUrl:
              page.url
          }

        );

        totalIndexed++;

      }

    }

    /* ================= ASSIGNMENTS ================= */

    for (const a of (
      course.assignments || []
    )) {

      const cleanedAssignment =
        cleanCanvasContent(
          a.description || ""
        );

      const text = [

        a.name,

        cleanedAssignment

      ]
      .filter(Boolean)
      .join("\n\n");

      if (
        !text ||
        text.length < 180
      ) {
        continue;
      }

      const chunks =
        chunkText(text);

      for (const chunk of chunks) {

        const embedding =
          await getLocalEmbedding(
            chunk
          );

        await upsertPoint(

          generateId(),

          embedding,

          {
            type: "assignment",

            courseId,

            courseName:
              course.name,

            title:
              a.name,

            content:
              chunk
          }

        );

        totalIndexed++;

      }

    }

    /* ================= DISCUSSIONS ================= */

    for (const d of (
      course.discussions || []
    )) {

      const cleanedDiscussion =
        cleanCanvasContent(
          d.message || ""
        );

      const text = [

        d.title,

        cleanedDiscussion

      ]
      .filter(Boolean)
      .join("\n\n");

      if (
        !text ||
        text.length < 180
      ) {
        continue;
      }

      const chunks =
        chunkText(text);

      for (const chunk of chunks) {

        const embedding =
          await getLocalEmbedding(
            chunk
          );

        await upsertPoint(

          generateId(),

          embedding,

          {
            type: "discussion",

            courseId,

            courseName:
              course.name,

            title:
              d.title,

            content:
              chunk
          }

        );

        totalIndexed++;

      }

    }

    /* ================= FILES ================= */

    /* ================= FILES ================= */

      for (const f of (
        course.files || []
      )) {

        const fileName =
          (
            f.display_name || ""
          ).toLowerCase();

        // SKIP MEDIA / GARBAGE FILES
        if (

          fileName.endsWith(".svg") ||
          fileName.endsWith(".png") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".gif") ||
          fileName.includes("play_video") ||
          fileName.includes("objective_m")

        ) {
          continue;
        }

        const text =
          f.display_name;

        if (
          !text ||
          text.length < 8
        ) {
          continue;
        }

        const embedding =
          await getLocalEmbedding(
            text
          );

        await upsertPoint(

          generateId(),

          embedding,

          {
            type: "file",

            courseId,

            courseName:
              course.name,

            title:
              f.display_name,

            content:
              text
          }

        );

        totalIndexed++;

      }

  }

  console.log(
    `🎉 Vector build complete. Indexed: ${totalIndexed}`
  );

}

/* -------------------------------------------------- */
/* EXPORT */
/* -------------------------------------------------- */

module.exports = {
  buildKnowledgeStore
};

/* -------------------------------------------------- */
/* PREVENT DIRECT RUN */
/* -------------------------------------------------- */

if (require.main === module) {

  console.log(
    "⚠ knowledgeBuilder should be called from sync.js with Canvas data"
  );

}