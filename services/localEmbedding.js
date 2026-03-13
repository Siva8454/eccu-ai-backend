const axios = require("axios");

async function getLocalEmbedding(text) {

  const res = await axios.post(
    "http://127.0.0.1:11434/api/embed",
    {
      model: "nomic-embed-text",
      input: text
    }
  );

  return res.data.embeddings[0];
}

module.exports = { getLocalEmbedding };