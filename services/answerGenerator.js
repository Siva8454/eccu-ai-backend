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

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are an ECCU course tutor." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (err) {

    console.error("Groq error:", err.response?.data || err.message);
    throw err;

  }

}

module.exports = { generateAnswer };