const axios = require("axios");

async function generateAnswer(question, context) {

  const prompt = `
You are an ECCU AI tutor.

Answer the student's question using ONLY the context below.
Be clear and helpful.
If labs are mentioned, explain what the student will learn.

Context:
${context}

Question:
${question}
`;

  const response = await axios.post(
    "http://localhost:11434/api/generate",
    {
      model: "llama3",
      prompt: prompt,
      stream: false
    }
  );

  return response.data.response;
}

module.exports = { generateAnswer };