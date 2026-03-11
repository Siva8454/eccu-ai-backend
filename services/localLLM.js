const axios = require("axios");

async function generateAnswer(question, context) {

  const prompt = `
You are an ECCU course tutor.

Answer the student's question using the course materials.

Student Question:
${question}

Course Materials:
${context}

Provide:
1. Clear explanation
2. Related lecture notes
3. Video resources if available
4. Book references if available
5. Provide all related contents if available

IMPORTANT:
Only include course resources (videos, lecture notes, ebooks) 
if the question is related to course topics.

If the question is a support issue (labs, login, ebook access),
do NOT include course references.

Do not invent information.
`;

  const res = await axios.post("http://localhost:11434/api/generate", {
    model: "llama3",
    prompt: prompt,
    stream: false
  });

  return res.data.response;
}

module.exports = { generateAnswer };