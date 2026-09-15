require("dotenv").config();

const { QdrantClient } = require("@qdrant/js-client-rest");

const courseMappings =
  require("../config/courseMappings");

const courseConfigs =
  require("../config/courseConfig");


/* =========================================================
   QDRANT CLIENT
   ========================================================= */

const client =
  new QdrantClient({

    url:
      process.env.QDRANT_URL,

    apiKey:
      process.env.QDRANT_API_KEY

  });


/* =========================================================
   GET UNIQUE COLLECTIONS
   ========================================================= */

function getUniqueCollections() {

  const collections =
    new Map();


  for (
    const [courseId, configKey]
    of Object.entries(courseMappings)
  ) {

    const config =
      courseConfigs[configKey];


    if (!config) {

      console.log(
        `⚠️ Missing course config: ${configKey} (Canvas ID: ${courseId})`
      );

      continue;
    }


    if (!config.collection) {

      console.log(
        `⚠️ Missing collection in ${configKey} (Canvas ID: ${courseId})`
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
   CREATE INDEX SAFELY
   ========================================================= */

async function createIndex(
  collection,
  fieldName,
  fieldSchema
) {

  try {

    await client.createFieldIndex(
      collection,
      {
        field_name:
          fieldName,

        field_schema:
          fieldSchema
      }
    );


    console.log(
      `   ✅ ${fieldName} index ready`
    );


  } catch (err) {

    const message =
      err?.message ||
      "";


    /*
     * If Qdrant says the index already exists,
     * this is not a failure.
     */

    if (
      message
        .toLowerCase()
        .includes("already exists")
    ) {

      console.log(
        `   ℹ️ ${fieldName} index already exists`
      );

      return;
    }


    console.error(
      `   ❌ Failed creating ${fieldName} index`
    );

    console.error(
      err?.response?.data ||
      message ||
      err
    );

  }
}


/* =========================================================
   CREATE ALL INDEXES FOR ONE COLLECTION
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


  /*
   * IMPORTANT:
   *
   * These indexes match the payload created by
   * vectorIndexer.js.
   */


  await createIndex(
    collection,
    "courseId",
    "integer"
  );


  await createIndex(
    collection,
    "moduleNumber",
    "integer"
  );


  await createIndex(
    collection,
    "courseName",
    "keyword"
  );


  await createIndex(
    collection,
    "courseCode",
    "keyword"
  );


  await createIndex(
    collection,
    "type",
    "keyword"
  );


  console.log(
    `✅ Index setup complete: ${collection}`
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
    "🟢 COURSE-SPECIFIC QDRANT INDEX SETUP"
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
     Get unique collections
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
      "❌ No valid collections found from courseMappings/courseConfig"
    );

  }


  /* -------------------------------------------------------
     Create indexes
     ------------------------------------------------------- */

  let successful =
    0;

  let failed =
    0;


  for (
    const [
      collection,
      config
    ]
    of collections
  ) {

    try {

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
        `❌ Failed: ${collection}`
      );

      console.error(
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
    "🚀 INDEX SETUP COMPLETE"
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