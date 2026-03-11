const axios = require("axios");

async function getLocalEmbedding(text) {
  const res = await axios.post("http://localhost:11434/api/embeddings", {
    model: "nomic-embed-text",
    prompt: text
  });

  return res.data.embedding;
}

module.exports = { getLocalEmbedding };