const axios = require("axios");

async function getLocalEmbedding(text) {

  const res = await axios.post(
    "https://api.together.xyz/v1/embeddings",
    {
      model: "togethercomputer/m2-bert-80M-8k-retrieval",
      input: text
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.data[0].embedding;
}

module.exports = { getLocalEmbedding };