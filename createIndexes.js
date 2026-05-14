require("dotenv").config();
const { QdrantClient } = require("@qdrant/js-client-rest");


const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const COLLECTION = "eccu_knowledge";

async function createIndexes() {

  console.log("Creating payload indexes...");

  await client.createFieldIndex(COLLECTION, {
    field_name: "courseId",
    field_schema: "integer"
  });

  await client.createFieldIndex(COLLECTION, {
    field_name: "moduleNumber",
    field_schema: "integer"
  });

  await client.createFieldIndex(COLLECTION, {
    field_name: "courseName",
    field_schema: "keyword"
  });

  await client.createFieldIndex(COLLECTION, {
    field_name: "type",
    field_schema: "keyword"
  });

  console.log("Indexes created successfully");
}

createIndexes();