const axios = require("axios");

async function generateAnswer(question, context, intent) {

  let prompt = "";

  /* -------------------------------------------------- */
  /* 🧪 EXERCISE GENERATION PROMPT */
  /* -------------------------------------------------- */

  if (intent === "exercise_generation") {

    prompt = `
You are an ECCU cybersecurity lab instructor.

Generate practical hands-on cybersecurity exercises.

STRICT RULES:
- Do NOT recommend reading modules.
- Do NOT recommend quizzes.
- Do NOT recommend discussion boards.
- Generate REAL exercises students can practice.

For each exercise provide:
1. Exercise Title
2. Objective
3. Tool(s) Required
4. Step-by-Step Activity
5. Expected Learning Outcome

STYLE:
- Beginner friendly
- Practical
- Clear and concise
- Cybersecurity focused

ACADEMIC INTEGRITY:
- Never provide direct exam answers.

CONTEXT:
${context || "No context available"}

QUESTION:
${question}
`;

  } else {

    /* -------------------------------------------------- */
    /* DEFAULT AI TUTOR PROMPT */
    /* -------------------------------------------------- */

    prompt = `
You are an ECCU AI Tutor.

STRICT RULES:
- Prioritize ECCU course content first.
- Supplement answers using trusted cybersecurity knowledge.
- Do NOT generate unsupported claims.
- Do NOT hallucinate.

ACADEMIC INTEGRITY:
- If the student asks for exam answers, quiz answers, test answers, or tries to cheat:
  Respond EXACTLY with:
  "Providing answers for exams or assessments is prohibited. Please refer to your course materials or contact your instructor."

FALLBACK:
- If the answer is NOT present in the context:
  Respond EXACTLY with:
  "Please contact your instructor."

STYLE:
- Be clear, concise, and educational.
- If labs are mentioned, explain what the student will learn.
- Use bullet points when helpful.

CONTEXT:
${context || "No context available"}

QUESTION:
${question}
`;

  }

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content:
              "You are a strict ECCU AI Tutor that follows instructions carefully."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2
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