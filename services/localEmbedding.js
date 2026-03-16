const axios = require("axios")

const HF_API =
"https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2"

async function getLocalEmbedding(text){

const res = await axios.post(
HF_API,
{ inputs: text },
{
headers:{
Authorization: `Bearer ${process.env.HF_API_KEY}`
}
}
)

return res.data[0]

}

module.exports = { getLocalEmbedding }