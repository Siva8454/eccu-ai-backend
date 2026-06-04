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
${cleanCanvasText(context?.currentPage || "").slice(0, 8000)}

ADDITIONAL COURSE CONTEXT:
${cleanCanvasText(context?.extraContext || "").slice(0, 4000)}

`;

    const prompt = `
You are an ECCU AI Tutor.

Student Question:
${question}

Course Content:
${formattedContext}

IMPORTANT:

- Answer ONLY using the current course content.
- Ignore references to any other course that may appear in memory, history, or context.
- Never mention another course unless it explicitly appears in CURRENT PAGE CONTENT.
- If the student is in PSY360, do not mention ECCU501.
- If the student is in ECCU501, do not mention PSY360.

Instructions:

1. ALWAYS use CURRENT PAGE CONTENT as the primary source.
2. The student is currently viewing this page.
3. If the page contains the answer, explain it completely.
4. If the student asks:
   - explain this
   - explain it
   - simplify this
   - I don't understand
   - help me understand

   then explain the CURRENT PAGE CONTENT in simpler language.

5. For assignments:
   - explain the purpose
   - explain the requirements
   - explain the steps
   - explain what must be submitted
   - explain grading expectations if available

6. For research projects:
   - break the instructions into numbered steps
   - explain each step clearly
   - summarize what the student must do

7. Never stop mid-sentence.
8. Never provide partial answers.
9. Do not invent information that is not present in the page content.
10. Use ADDITIONAL COURSE CONTEXT only if the page content is insufficient.
11. For technical issues:
   - provide troubleshooting steps first
   - do not invent fixes
   - if the issue cannot be resolved, advise the student to contact support through the course Help page

Response Style:

- Use headings.
- Use bullet points.
- Use numbered steps when explaining assignments.
- Be concise but complete.
- Do NOT include sources, references, citations, resource lists, links, or additional reading sections.
- Answer only the student's question.
`;

    console.log("================================");
console.log("FORMATTED CONTEXT");
console.log("================================");
console.log(formattedContext);
console.log("================================");

console.log("================================");
console.log("FINAL PROMPT");
console.log("================================");
console.log(prompt);
console.log("================================");

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 2000,
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