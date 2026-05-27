require("dotenv").config();

const axios = require("axios");

async function createCollection(name) {

  try {

    await axios.put(
      `${process.env.QDRANT_URL}/collections/${name}`,
      {
        vectors: {
          size: 384,
          distance: "Cosine"
        }
      },
      {
        headers: {
          "api-key": process.env.QDRANT_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`✅ ${name} created`);

  } catch (err) {

    if (
      err.response?.data?.status?.error
        ?.includes("already exists")
    ) {

      console.log(
        `✅ ${name} already exists`
      );

    } else {

      console.error(err.response?.data || err.message);

    }

  }
}

  async function createCourseIdIndex() {

  try {

    await axios.put(
      `${process.env.QDRANT_URL}/collections/eccu_knowledge_v7/index`,
      {
        field_name: "courseId",
        field_schema: "integer"
      },
      {
        headers: {
          "api-key": process.env.QDRANT_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(
      "✅ courseId index created"
    );

  } catch (err) {

    console.log(
      err.response?.data || err.message
    );

  }

}

async function setup() {

  await createCollection(
    "eccu_knowledge_v7"
  );

await createCourseIdIndex();

  
  console.log(
    "✅ courseCode index created"
  );

}

setup();