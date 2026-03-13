require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

async function setup() {

  const collections = await client.getCollections();

  const exists = collections.collections.find(
    c => c.name === "eccu_knowledge"
  );

  if (exists) {
    console.log("Collection already exists");
    return;
  }

  await client.createCollection("eccu_knowledge", {
    vectors: {
      size: 384,
      distance: "Cosine"
    }
  });

  console.log("Collection created");
}

setup();