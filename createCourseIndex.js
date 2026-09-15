require("dotenv").config();

const {
  QdrantClient
} = require("@qdrant/js-client-rest");

const courseMappings =
  require("../config/courseMappings");

const courseConfigs =
  require("../config/courseConfig");


/* =========================================================
   QDRANT CLIENT
   ========================================================= */

const qdrant =
  new QdrantClient({

    url:
      process.env.QDRANT_URL,

    apiKey:
      process.env.QDRANT_API_KEY

  });


/* =========================================================
   GET UNIQUE COURSE COLLECTIONS
   ========================================================= */

function getUniqueCollections() {

  const collections =
    new Map();


  for (
    const [
      courseId,
      configKey
    ]
    of Object.entries(
      courseMappings
    )
  ) {

    const config =
      courseConfigs[configKey];


    if (!config) {

      console.log(
        `⚠️ Missing config: ${configKey} (Canvas ID: ${courseId})`
      );

      continue;
    }


    if (!config.collection) {

      console.log(
        `⚠️ Missing collection for ${configKey} (Canvas ID: ${courseId})`
      );

      continue;
    }


    if (
      !collections.has(
        config.collection
      )
    ) {

      collections.set(
        config.collection,
        {
          configKey,
          courseIds: []
        }
      );

    }


    collections
      .get(config.collection)
      .courseIds
      .push(
        Number(courseId)
      );

  }


  return collections;
}


/* =========================================================
   CREATE ONE INDEX SAFELY
   ========================================================= */

async function createIndex(
  collection,
  fieldName,
  fieldSchema
) {

  try {

    await qdrant.createPayloadIndex(
      collection,
      {
        field_name:
          fieldName,

        field_schema:
          fieldSchema
      }
    );


    console.log(
      `   ✅ Index ready: ${fieldName}`
    );


  } catch (err) {

    const message =
      err?.message ||
      "";


    if (
      message
        .toLowerCase()
        .includes("already exists")
    ) {

      console.log(
        `   ℹ️ Already exists: ${fieldName}`
      );

      return;
    }


    console.error(
      `   ❌ Failed: ${fieldName}`
    );

    console.error(
      err?.response?.data ||
      message ||
      err
    );

  }
}


/* =========================================================
   CREATE INDEXES FOR ONE COLLECTION
   ========================================================= */

async function createIndexesForCollection(
  collection,
  configKey,
  courseIds
) {

  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    `📦 Collection: ${collection}`
  );

  console.log(
    `⚙️ Config: ${configKey}`
  );

  console.log(
    `🆔 Canvas IDs: ${courseIds.join(", ")}`
  );

  console.log(
    "================================================="
  );


  /* -------------------------------------------------------
     COURSE ID
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "courseId",
    "integer"
  );


  /* -------------------------------------------------------
     COURSE CODE
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "courseCode",
    "keyword"
  );


  /* -------------------------------------------------------
     COURSE NAME
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "courseName",
    "keyword"
  );


  /* -------------------------------------------------------
     MODULE NUMBER
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "moduleNumber",
    "integer"
  );


  /* -------------------------------------------------------
     MODULE NAME
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "moduleName",
    "keyword"
  );


  /* -------------------------------------------------------
     CONTENT TYPE
     ------------------------------------------------------- */

  await createIndex(
    collection,
    "type",
    "keyword"
  );


  console.log(
    `✅ Completed: ${collection}`
  );
}


/* =========================================================
   MAIN
   ========================================================= */

async function createIndexes() {

  console.log(
    "================================================="
  );

  console.log(
    "🟢 COURSE-SPECIFIC QDRANT INDEX CREATION"
  );

  console.log(
    "================================================="
  );


  console.log(
    "QDRANT URL:",
    process.env.QDRANT_URL
  );

  console.log(
    "QDRANT API KEY:",
    process.env.QDRANT_API_KEY
      ? "FOUND"
      : "MISSING"
  );


  if (
    !process.env.QDRANT_URL
  ) {

    throw new Error(
      "❌ QDRANT_URL is missing"
    );

  }


  if (
    !process.env.QDRANT_API_KEY
  ) {

    throw new Error(
      "❌ QDRANT_API_KEY is missing"
    );

  }


  /* -------------------------------------------------------
     Resolve unique collections
     ------------------------------------------------------- */

  const collections =
    getUniqueCollections();


  console.log("");
  console.log(
    `📦 Unique collections found: ${collections.size}`
  );


  if (
    collections.size === 0
  ) {

    throw new Error(
      "❌ No valid course collections found."
    );

  }


  let successful =
    0;

  let failed =
    0;


  /* -------------------------------------------------------
     Create indexes
     ------------------------------------------------------- */

  for (
    const [
      collection,
      config
    ]
    of collections
  ) {

    try {

      /*
       * The collection should already have been created
       * by setupCollection.js.
       */

      await qdrant.getCollection(
        collection
      );


      await createIndexesForCollection(

        collection,

        config.configKey,

        config.courseIds

      );


      successful++;

    } catch (err) {

      failed++;


      console.error("");

      console.error(
        `❌ Could not process collection: ${collection}`
      );

      console.error(
        err?.response?.data ||
        err?.message ||
        err
      );

    }

  }


  /* =======================================================
     SUMMARY
     ======================================================= */

  console.log("");
  console.log(
    "================================================="
  );

  console.log(
    "🚀 COURSE INDEX CREATION COMPLETE"
  );

  console.log(
    "================================================="
  );

  console.log(
    `📦 Collections: ${collections.size}`
  );

  console.log(
    `✅ Successful: ${successful}`
  );

  console.log(
    `❌ Failed: ${failed}`
  );

  console.log(
    "================================================="
  );


  if (
    failed > 0
  ) {

    process.exitCode = 1;

  }

}


/* =========================================================
   RUN
   ========================================================= */

createIndexes()
  .catch(err => {

    console.error("");

    console.error(
      "❌ Index creation failed:"
    );

    console.error(
      err?.response?.data ||
      err?.message ||
      err
    );

    process.exitCode = 1;

  });