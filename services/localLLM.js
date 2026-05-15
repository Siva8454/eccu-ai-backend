const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function generateAnswer(question, context) {

  try {

    const prompt = `
You are an ECCU AI Tutor.

Student Question:
${question}

Course Content:
${context}

Instructions:

1. If the question is about a COURSE TOPIC:
   - Clearly explain the concept in simple terms
   - Use structured explanation (steps / points if needed)
   - If module references, links, or resources are present, include them

2. If the question is a SUPPORT ISSUE (lab, ebook, login, etc):
   - Provide only a direct solution
   - DO NOT include course references

3. If the answer is NOT found in the provided course content:
   - Say:
   "This topic is not available in your course materials. Please connect with your instructor for further clarification."

4. Do NOT invent information

5. When giving security examples, clearly label placeholder URLs as illustrative examples only
- Do not present example.com links as real vulnerable websites
- Prefer pseudocode or sample endpoint patterns instead of fake live URLs

Make the answer clear, structured, and student-friendly.
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const answer = response?.choices?.[0]?.message?.content;

    return answer || "AI could not generate a response.";

  } catch (err) {

    console.error("❌ Groq error:", err);

    return "AI service is temporarily unavailable. Please try again.";

  }

}

module.exports = { generateAnswer };