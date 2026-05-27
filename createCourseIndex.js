require("dotenv").config();

const {
  QdrantClient
} = require("@qdrant/js-client-rest");

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION = "eccu_knowledge_v7";

async function createIndexes() {

  const fields = [

    {
      name: "courseId",
      schema: "integer"
    },

    {
      name: "type",
      schema: "keyword"
    },

    {
      name: "moduleName",
      schema: "keyword"
    }

  ];

  for (const field of fields) {

    try {

      await qdrant.createPayloadIndex(
        COLLECTION,
        {
          field_name: field.name,
          field_schema: field.schema
        }
      );

      console.log(
        `✅ Index created: ${field.name}`
      );

    } catch (err) {

      console.log(
        `ℹ️ Index may already exist: ${field.name}`
      );
    }
  }
}

createIndexes();