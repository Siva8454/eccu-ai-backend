const axios = require("axios");

async function classifyCourseRelevance(
  courseName,
  question,
  previousQuestion = ""
) {

  const prompt = `
You are a strict academic course relevance classifier.

Course:
${courseName}

Previous Question:
${previousQuestion || "None"}

Student Question:
${question}

RULES:

- Return RELATED only if the question belongs directly to the academic subject area of the course.
- Greetings are RELATED.
- If unsure, return NOT_RELATED.
- Questions from another academic discipline are NOT_RELATED.
- Roleplay requests such as:
  "Act as..."
  "Pretend to be..."
  "You are..."
  are NOT_RELATED unless the topic itself belongs to the course.

  - If the Student Question is a follow-up,
  continuation, clarification,
  simplification, summary request,
  or expansion of the Previous Question,
  treat it as RELATED if the Previous Question
  belongs to the course.

Examples:

Previous Question:
Explain SQL Injection

Current Question:
Can you simplify that?

RELATED

Previous Question:
Explain capital budgeting

Current Question:
Give one example

RELATED

Previous Question:
List hands-on ethical hacking exercises

Current Question:
Please simplify the list with one exercise per step

RELATED

Examples:

Course: Psychology
Question: What is social cognition?
RELATED

Course: Psychology
Question: What is SQL Injection?
NOT_RELATED

Course: Financial Management
Question: What is capital budgeting?
RELATED

Course: Financial Management
Question: Explain ransomware.
NOT_RELATED

Course: Mathematics
Question: Solve x² + 4x + 4 = 0
RELATED

Course: Mathematics
Question: Explain phishing attacks.
NOT_RELATED

Course: Science
Question: Explain photosynthesis.
RELATED

Course: Science
Question: What is SQL Injection?
NOT_RELATED

Course: Ethical Hacking
Question: What is SQL Injection?
RELATED

Respond with ONLY:

RELATED

or

NOT_RELATED
`;

console.log("=== Sending request to Fireworks ===");
console.log("URL:", "https://api.fireworks.ai/inference/v1/chat/completions");
console.log("Model:", process.env.FIREWORKS_MODEL);

  try {

    const response = await axios.post(

      "https://api.fireworks.ai/inference/v1/chat/completions",

      {

        model: process.env.FIREWORKS_MODEL,

        temperature: 0,

        max_tokens: 10,

        messages: [

          {
            role: "user",
            content: prompt
          }

        ]

      },

      {

        headers: {

          Authorization:
            `Bearer ${process.env.FIREWORKS_API_KEY}`,

          "Content-Type":
            "application/json"

        }

      }

    );

console.log("=== Classifier Response ===");
console.log(JSON.stringify(response.data, null, 2));

    const result =
      response.data.choices[0]
      .message.content
      .trim()
      .toUpperCase();

    return result === "RELATED";

  }

  catch (err) {

  console.error("===== CLASSIFIER ERROR =====");
  console.error("Status:", err.response?.status);
  console.error("Data:", JSON.stringify(err.response?.data, null, 2));
  console.error("Message:", err.message);

  return false;

}

}

module.exports = {
  classifyCourseRelevance
};