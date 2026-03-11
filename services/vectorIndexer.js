const { QdrantClient } = require("@qdrant/js-client-rest");
const { getLocalEmbedding } = require("./localEmbedding");
const fs = require("fs");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge";

async function indexKnowledgeStore() {
  const store = JSON.parse(
    fs.readFileSync("./data/knowledge-store.json", "utf-8")
  );

  const points = [];
  let id = 1;

  store.courses.forEach(course => {
  (course.modules || []).forEach(module => {
    const items = module.items || module.moduleItems || [];

    items.forEach(item => {
      if (!item.title && !item.name) return;

      const title = item.title || item.name;
      const content = item.content || item.description || "";

      const text = `${title}\n${content}`;

      points.push({
        id: id++,
        payload: {
          courseId: course.courseId,
          courseName: course.courseName,
          moduleName: module.moduleName,
          title,
          content
        },
        text
      });
    });
  });
});

  console.log("Courses:", store.courses.length);

store.courses.forEach(c => {
  console.log("Course:", c.courseName);
  console.log("Modules:", c.modules?.length);
});

  console.log("Creating embeddings...");

  const vectors = [];
  for (const p of points) {
    const embedding = await getLocalEmbedding(p.text);
    vectors.push({
      id: p.id,
      vector: embedding,
      payload: p.payload
    });
  }

  await qdrant.upsert(COLLECTION, {
    wait: true,
    points: vectors
  });

  console.log("Vector indexing complete 🚀");
}

module.exports = { indexKnowledgeStore };