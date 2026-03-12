const axios = require("axios");

async function getLocalEmbedding(text) {

  const res = await axios.post(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      inputs: text
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`
      }
    }
  );

  return res.data[0];
}

module.exports = { getLocalEmbedding };