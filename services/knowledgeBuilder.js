require("dotenv").config();

const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");

/* -------------------------------------------------- */
/* QDRANT CLIENT */
/* -------------------------------------------------- */

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
  checkCompatibility: false
});

const COLLECTION = "eccu_knowledge";

console.log("Knowledge builder started...");

/* -------------------------------------------------- */
/* EXTRACT LINKS FROM HTML */
/* -------------------------------------------------- */

function extractLinks(html) {

  if (!html) return [];

  const links = [];
  const regex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;

  let match;

  while ((match = regex.exec(html))) {

    links.push({
      url: match[1],
      text: match[2].replace(/<[^>]+>/g, "")
    });

  }

  return links;
}

/* -------------------------------------------------- */
/* ENSURE COLLECTION EXISTS */
/* -------------------------------------------------- */

async function ensureCollection() {

  try {

    await client.getCollection(COLLECTION);
    console.log("📦 Collection already exists");

  } catch {

    console.log("🆕 Creating Qdrant collection...");

    await client.createCollection(COLLECTION, {
      vectors: {
        size: 768,
        distance: "Cosine"
      }
    });

    console.log("✅ Collection created");

  }

}

/* -------------------------------------------------- */
/* TEXT CHUNKER */
/* -------------------------------------------------- */

function chunkText(text, size = 600) {

  if (!text) return [];

  const chunks = [];

  let i = 0;

  while (i < text.length) {

    chunks.push(text.slice(i, i + size));
    i += size;

  }

  return chunks;
}

/* -------------------------------------------------- */
/* GENERATE UNIQUE ID */
/* -------------------------------------------------- */

function generateId() {

  return Date.now() + Math.floor(Math.random() * 100000);

}

/* -------------------------------------------------- */
/* MODULE NUMBER DETECTOR */
/* -------------------------------------------------- */

function detectModuleNumber(name) {

  if (!name) return null;

  const match = name.match(/module\s*0*(\d+)/i);

  if (match) return Number(match[1]);

  return null;

}

/* -------------------------------------------------- */
/* UPSERT VECTOR */
/* -------------------------------------------------- */

async function upsertPoint(id, embedding, payload) {

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

async function buildKnowledgeStore(canvasData) {

  await ensureCollection();

  console.log("🚀 Building ECCU vector knowledge...");

  let totalIndexed = 0;

  for (const course of canvasData || []) {

    const courseId = Number(course.id);

    console.log(`📘 Course: ${course.name}`);

    /* ================= MODULE ITEMS ================= */

    for (const module of (course.modules || [])) {

      const moduleNumber = detectModuleNumber(module.name);

      for (const item of (module.items || [])) {

        const text = `
Course: ${course.name}

Module: ${module.name}

Module Number: ${moduleNumber || "Unknown"}

Item Title: ${item.title || ""}

Description:
${item.content || item.body || item.description || item.title || ""}
`;

        const chunks = chunkText(text);

        for (const chunk of chunks) {

          const embedding = await getLocalEmbedding(chunk);

          await upsertPoint(generateId(), embedding, {

            type: "module_item",
            courseId,
            courseName: course.name,
            moduleName: module.name,
            moduleNumber,
            title: item.title,
            content: chunk

          });

          totalIndexed++;

        }

      }

    }

    /* ================= PAGES ================= */

    for (const page of (course.pages || [])) {

      const links = extractLinks(page.body);

      const text = `
Course: ${course.name}

Page: ${page.title}

Content:
${page.body || ""}
`;

      const chunks = chunkText(text);

      for (const chunk of chunks) {

        const embedding = await getLocalEmbedding(chunk);

        await upsertPoint(generateId(), embedding, {

          type: "page",
          courseId,
          courseName: course.name,
          title: page.title,
          content: chunk,
          links,
          pageUrl: page.url

        });

        totalIndexed++;

      }

    }

    /* ================= ASSIGNMENTS ================= */

    for (const a of (course.assignments || [])) {

      const text = `
Course: ${course.name}

Assignment: ${a.name}

Description:
${a.description || ""}
`;

      const chunks = chunkText(text);

      for (const chunk of chunks) {

        const embedding = await getLocalEmbedding(chunk);

        await upsertPoint(generateId(), embedding, {

          type: "assignment",
          courseId,
          courseName: course.name,
          title: a.name,
          content: chunk

        });

        totalIndexed++;

      }

    }

    /* ================= DISCUSSIONS ================= */

    for (const d of (course.discussions || [])) {

      const text = `
Course: ${course.name}

Discussion Topic: ${d.title}

Content:
${d.message || ""}
`;

      const chunks = chunkText(text);

      for (const chunk of chunks) {

        const embedding = await getLocalEmbedding(chunk);

        await upsertPoint(generateId(), embedding, {

          type: "discussion",
          courseId,
          courseName: course.name,
          title: d.title,
          content: chunk

        });

        totalIndexed++;

      }

    }

    /* ================= FILES ================= */

    for (const f of (course.files || [])) {

      const text = `
Course: ${course.name}

File:
${f.display_name}
`;

      const embedding = await getLocalEmbedding(text);

      await upsertPoint(generateId(), embedding, {

        type: "file",
        courseId,
        courseName: course.name,
        title: f.display_name,
        content: text

      });

      totalIndexed++;

    }

  }

  console.log(`🎉 Vector build complete. Indexed: ${totalIndexed}`);

}

/* -------------------------------------------------- */
/* EXPORT */
/* -------------------------------------------------- */

module.exports = { buildKnowledgeStore };

/* -------------------------------------------------- */
/* PREVENT DIRECT RUN */
/* -------------------------------------------------- */

if (require.main === module) {

  console.log("⚠ knowledgeBuilder should be called from sync.js with Canvas data");

}