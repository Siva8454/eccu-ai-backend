require("dotenv").config();

const axios = require("axios");

async function createCollection(name) {

  try {

    await axios.put(
      `${process.env.QDRANT_URL}/collections/${name}`,
      {
        vectors: {
          size: 768,
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

async function setup() {

  await createCollection(
    "eccu_501"
  );

}

setup();