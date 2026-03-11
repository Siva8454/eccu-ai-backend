const { indexKnowledgeStore } = require("./services/vectorIndexer");

async function run() {
  await indexKnowledgeStore();
  process.exit();
}

run();