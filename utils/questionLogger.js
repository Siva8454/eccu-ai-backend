const fs = require("fs");
const path = require("path");

const QUESTIONS_FILE = path.join(
  __dirname,
  "../data/questions.json"
);

console.log("Question Logger Called");

function logQuestion(data) {
  try {

    // Create file if it doesn't exist
    if (!fs.existsSync(QUESTIONS_FILE)) {
      fs.writeFileSync(
        QUESTIONS_FILE,
        JSON.stringify([], null, 2)
      );
    }

    // Read existing questions
    let questions = [];

try {
    questions = JSON.parse(
        fs.readFileSync(QUESTIONS_FILE, "utf8")
    );
} catch {
    questions = [];
}

    // Create new record
    const record = {
      id: Date.now().toString(),

      timestamp: new Date().toISOString(),

      courseId: data.courseId || "",
      courseCode: data.courseCode || "",
      courseName: data.courseName || "",

      module: data.module || "",

      pageTitle: data.pageTitle || "",
      pageType: data.pageType || "",

      userId: data.userId || "",

      question: data.question || "",

      answer: data.answer || "",

      intent: data.intent || "",

      source: data.source || "",

      confidence: data.confidence || 0,

      responseTime: data.responseTime || 0,

      feedback: data.feedback || null
    };

    questions.push(record);

    console.log("Questions length:", questions.length);

    fs.writeFileSync(
      QUESTIONS_FILE,
      JSON.stringify(questions, null, 2)
    );

    console.log("Saved Successfully");

  } catch (err) {

    console.error(
      "Question Logger Error:",
      err
    );

  }
}

module.exports = {
  logQuestion
};