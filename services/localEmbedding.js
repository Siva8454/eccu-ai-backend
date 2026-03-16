const { pipeline } = require("@xenova/transformers")

let embedder = null

async function initModel() {

  if (!embedder) {

    console.log("Loading embedding model...")

    embedder = await pipeline(
      "feature-extraction",
      "Xenova/bge-base-en-v1.5"
    )

    console.log("Embedding model loaded")
  }

  return embedder
}

async function getLocalEmbedding(text) {

  const model = await initModel()

  const output = await model(text, {
    pooling: "mean",
    normalize: true
  })

  return Array.from(output.data)
}

module.exports = { getLocalEmbedding }