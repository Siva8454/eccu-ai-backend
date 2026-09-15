require("dotenv").config();

const { QdrantClient } = require("@qdrant/js-client-rest");

const courseMappings = require("./config/courseMappings");
const courseConfigs = require("./config/courseConfig");

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});


/* =========================================================
   GET UNIQUE COURSE CONFIGURATIONS
   ========================================================= */

function getCourseCollections() {

  const collections = new Map();

  for (const [courseId, configKey] of Object.entries(courseMappings)) {

    const config = courseConfigs[configKey];

    if (!config) {
      console.log(
        `⚠️ Missing config: ${configKey} for Canvas Course ${courseId}`
      );
      continue;
    }

    if (!config.collection) {
      console.log(
        `⚠️ Missing collection in config: ${configKey}`
      );
      continue;
    }

    if (!collections.has(config.collection)) {

      collections.set(config.collection, {
        configKey,
        collection: config.collection,
        courseIds: []
      });

    }

    collections
      .get(config.collection)
      .courseIds
      .push(Number(courseId));
  }

  return [...collections.values()];
}


/* =========================================================
   CREATE / VERIFY COLLECTION
   ========================================================= */

async function ensureCollection(collection) {

  try {

    await client.getCollection(collection);

    console.log(
      `✅ Collection already exists: ${collection}`
    );

  } catch (err) {

    console.log(
      `🆕 Creating Qdrant collection: ${collection}`
    );

    await client.createCollection(
      collection,
      {
        vectors: {
          size: 384,
          distance: "Cosine"
        }
      }
    );

    console.log(
      `✅ Collection created: ${collection}`
    );
  }
}


/* =========================================================
   CREATE PAYLOAD INDEX
   ========================================================= */

async function createIndex(
  collection,
  fieldName,
  fieldSchema
) {

  try {

    await client.createPayloadIndex(
      collection,
      {
        field_name: fieldName,
        field_schema: fieldSchema
      }
    );

    console.log(
      `   ✅ ${fieldName} index created`
    );

  } catch (err) {

    const message =
      err?.message ||
      "";

    if (
      message.toLowerCase().includes("already exists")
    ) {

      console.log(
        `   ℹ️ ${fieldName} index already exists`
      );

    } else {

      console.log(
        `   ⚠️ Could not create ${fieldName} index`
      );

      console.log(
        `      ${message}`
      );
    }
  }
}


/* =========================================================
   MAIN
   ========================================================= */

async function setupCollections() {

  console.log("");
  console.log("========================================");
  console.log("🚀 ECCU QDRANT COLLECTION SETUP");
  console.log("========================================");
  console.log("");

  if (
    !process.env.QDRANT_URL ||
    !process.env.QDRANT_API_KEY
  ) {

    throw new Error(
      "QDRANT_URL or QDRANT_API_KEY is missing"
    );

  }


  const collections =
    getCourseCollections();


  console.log(
    `📚 Course collections detected: ${collections.length}`
  );

  console.log("");


  for (const item of collections) {

    console.log("----------------------------------------");

    console.log(
      `🔗 Config: ${item.configKey}`
    );

    console.log(
      `📦 Collection: ${item.collection}`
    );

    console.log(
      `🆔 Canvas Course IDs: ${item.courseIds.join(", ")}`
    );

    console.log("----------------------------------------");


    /* CREATE / VERIFY COLLECTION */

    await ensureCollection(
      item.collection
    );


    /* PAYLOAD INDEXES */

    await createIndex(
      item.collection,
      "courseId",
      "integer"
    );

    await createIndex(
      item.collection,
      "courseCode",
      "keyword"
    );

    await createIndex(
      item.collection,
      "courseName",
      "keyword"
    );

    await createIndex(
      item.collection,
      "moduleNumber",
      "integer"
    );

    await createIndex(
      item.collection,
      "moduleName",
      "keyword"
    );

    await createIndex(
      item.collection,
      "type",
      "keyword"
    );


    console.log("");
  }


  console.log("========================================");
  console.log("✅ QDRANT SETUP COMPLETE");
  console.log(
    `📦 Collections processed: ${collections.length}`
  );
  console.log("========================================");
  console.log("");
}


setupCollections()
  .then(() => {

    console.log(
      "🎉 All course collections are ready."
    );

  })
  .catch(err => {

    console.error(
      "❌ Setup failed:"
    );

    console.error(
      err
    );

    process.exit(1);

  });