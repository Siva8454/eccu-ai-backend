const axios = require("axios");

async function getLocalEmbedding(text) {

  try {

    const res = await axios.post(
      "https://api.groq.com/openai/v1/embeddings",
      {
        model: "nomic-embed-text-v1.5",
        input: text
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.data[0].embedding;

  } catch (err) {

    console.error("Groq embedding error:", err.response?.data || err.message);
    throw err;

  }

}

module.exports = { getLocalEmbedding };