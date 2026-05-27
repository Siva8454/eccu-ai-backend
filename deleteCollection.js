require("dotenv").config();

const { QdrantClient } = require("@qdrant/js-client-rest");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

async function run() {

  await qdrant.deleteCollection("eccu_knowledge_v7");

  console.log("✅ Collection deleted");

}

run();