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
  continuation,
  clarification,
  simplification,
  summary request,
  or expansion of the Previous Question,
  treat it as RELATED if the Previous Question belongs to the course.

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

Course: Ethical Hacking
Question: What is SQL Injection?
RELATED

Respond ONLY with one word.

RELATED

or

NOT_RELATED
`;

  console.log("\n==============================");
  console.log(" COURSE CLASSIFIER ");
  console.log("==============================");
  console.log("Course:", courseName);
  console.log("Question:", question);
  console.log("Model:", process.env.FIREWORKS_MODEL);

  try {

    const response = await axios.post(

      "https://api.fireworks.ai/inference/v1/chat/completions",

      {

        model: process.env.FIREWORKS_MODEL,

        temperature: 0,

        max_tokens: 20,

        messages: [

          {
            role: "system",
            content: `
You are an academic classifier.

You MUST respond with EXACTLY one word.

Allowed responses:

RELATED

NOT_RELATED

Never explain.

Never add punctuation.

Never add additional text.

Never answer the student's question.
`
          },

          {
            role: "user",
            content: prompt
          }

        ]

      },

      {

        headers: {

          Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,

          "Content-Type": "application/json"

        }

      }

    );

    console.log("\n===== CLASSIFIER RESPONSE =====");
    console.log(JSON.stringify(response.data, null, 2));

    const result =
      response.data.choices[0].message.content
        .trim()
        .toUpperCase();

    console.log("Classifier Result:", result);

    if (result.startsWith("RELATED")) {
      console.log("Decision: RELATED");
      return true;
    }

    if (result.startsWith("NOT_RELATED")) {
      console.log("Decision: NOT_RELATED");
      return false;
    }

    console.log("Unexpected classifier output.");
    return false;

  }

  catch (err) {

    console.error("\n===== CLASSIFIER ERROR =====");
    console.error("Status:", err.response?.status);
    console.error(
      "Data:",
      JSON.stringify(err.response?.data, null, 2)
    );
    console.error("Message:", err.message);

    return false;

  }

}

module.exports = {
  classifyCourseRelevance
};