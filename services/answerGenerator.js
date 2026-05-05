const axios = require("axios");

async function generateAnswer(question, context) {

  const prompt = `
You are an ECCU AI Tutor.

STRICT RULES:
- Answer ONLY using the provided context.
- Do NOT generate answers outside the context.
- Do NOT guess or hallucinate.

ACADEMIC INTEGRITY:
- If the student asks for exam answers, quiz answers, test answers, or tries to cheat:
  → Respond EXACTLY with:
  "Providing answers for exams or assessments is prohibited. Please refer to your course materials or contact your instructor."

FALLBACK:
- If the answer is NOT present in the context:
  → Respond EXACTLY with:
  "Please contact your instructor."

STYLE:
- Be clear, concise, and helpful.
- If labs are mentioned, explain what the student will learn.

---------------------
CONTEXT:
${context || "No context available"}

---------------------
QUESTION:
${question}
`;

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are a strict ECCU AI Tutor that follows rules exactly."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2 // 🔥 lower = more controlled output
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