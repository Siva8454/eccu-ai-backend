const crypto = require("crypto")

function getLocalEmbedding(text) {

  const dimension = 768
  const vector = new Array(dimension).fill(0)

  const hash = crypto.createHash("sha512").update(text).digest()

  for (let i = 0; i < dimension; i++) {
    vector[i] = hash[i % hash.length] / 255
  }

  return vector
}

module.exports = { getLocalEmbedding }