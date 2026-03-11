const { QdrantClient } = require("@qdrant/js-client-rest");

const client = new QdrantClient({
  url: "http://localhost:6333"
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
      size: 768,
      distance: "Cosine"
    }
  });

  console.log("Collection created");
}

setup();
