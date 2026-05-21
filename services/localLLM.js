const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});


function cleanCanvasText(text = "") {
  return text
    .replace(/Published/g, "")
    .replace(/Settings/g, "")
    .replace(/Home Instructor Syllabus/g, "")
    .replace(/Click to unpublish/g, "")
    .replace(/Manage/g, "")
    .replace(/View All Pages/g, "")
    .replace(/Copyright.*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
async function generateAnswer(question, context) {

  

  try {

    const formattedContext = `

CURRENT PAGE TITLE:
${context?.pageTitle || "No page title"}

CURRENT PAGE CONTENT:
${cleanCanvasText(context?.currentPage || "").slice(0, 4000)}

ADDITIONAL COURSE CONTEXT:
${cleanCanvasText(context?.extraContext || "").slice(0, 2000)}

`;

    const prompt = `
You are an ECCU AI Tutor.

Student Question:
${question}

Course Content:
${formattedContext}

Instructions:

1. ALWAYS prioritize CURRENT PAGE CONTENT first.
2. The student is actively viewing the CURRENT PAGE.
3. If the answer exists in CURRENT PAGE CONTENT, answer directly from it.
4. Recognize:
   - module names
   - assignment names
   - labs
   - topics
   from the CURRENT PAGE CONTENT.
5. NEVER say:
   - "I don't see course content"
   - "Please provide more information"
   if CURRENT PAGE CONTENT exists.
6. Use ADDITIONAL COURSE CONTEXT only as secondary support.
7. Do NOT invent information.

Make the answer clear, structured, and student-friendly.
`;

    console.log("FORMATTED CONTEXT:");
console.log(formattedContext);

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