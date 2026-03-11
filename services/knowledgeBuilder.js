const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge";

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
    await qdrant.getCollection(COLLECTION);
    console.log("📦 Collection already exists");

  } catch {

    console.log("🆕 Creating Qdrant collection...");

    await qdrant.createCollection(COLLECTION, {
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
/* UPSERT POINT */
/* -------------------------------------------------- */

async function upsertPoint(id, embedding, payload) {

  await qdrant.upsert(COLLECTION, {
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

  let idCounter = 1;
  let totalIndexed = 0;

  for (const course of canvasData || []) {

    const courseId = course.id;

    console.log(`📘 Course: ${course.name}`);

    /* ================= MODULE ITEMS ================= */

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

    const moduleChunks = chunkText(text);

    await Promise.all(
      moduleChunks.map(async chunk => {

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

      })
    );

  }

}


    /* ================= PAGES ================= */

/* ================= PAGES ================= */

for (const page of (course.pages || [])) {

  const links = extractLinks(page.body);

  const text = `
Course: ${course.name}

Page: ${page.title}

Content:
${page.body || ""}
`;

  const pageChunks = chunkText(text);

  await Promise.all(
    pageChunks.map(async chunk => {

      const embedding = await getLocalEmbedding(chunk);

      await upsertPoint(idCounter++, embedding, {
        type: "page",
        courseId,
        courseName: course.name,
        title: page.title,
        content: chunk,
        links
      });

      totalIndexed++;

    })
  );
}

    

/* ================= ASSIGNMENTS ================= */

for (const a of (course.assignments || [])) {

  const text = `
Course: ${course.name}

Assignment: ${a.name}

Description:
${a.description || ""}
`;

  const assignmentChunks = chunkText(text);

  await Promise.all(
    assignmentChunks.map(async chunk => {

      const embedding = await getLocalEmbedding(chunk);

      await upsertPoint(idCounter++, embedding, {
        type: "assignment",
        courseId,
        courseName: course.name,
        title: a.name,
        content: chunk
      });

      totalIndexed++;

    })
  );

}

   

    /* ================= DISCUSSIONS ================= */

for (const d of (course.discussions || [])) {

  const text = `
Course: ${course.name}

Discussion Topic: ${d.title}

Content:
${d.message || ""}
`;

  const discussionChunks = chunkText(text);

  await Promise.all(
    discussionChunks.map(async chunk => {

      const embedding = await getLocalEmbedding(chunk);

      await upsertPoint(idCounter++, embedding, {
        type: "discussion",
        courseId,
        courseName: course.name,
        title: d.title,
        content: chunk
      });

      totalIndexed++;

    })
  );

}

  

   

   /* ================= FILES ================= */

for (const f of (course.files || [])) {

  const text = `
Course: ${course.name}

File:
${f.display_name}
`;

  const embedding = await getLocalEmbedding(text);

  await upsertPoint(idCounter++, embedding, {
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

module.exports = { buildKnowledgeStore };