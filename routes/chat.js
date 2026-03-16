const express = require("express");
const router = express.Router();


const { searchKnowledge } = require("../services/eccuResponder");
const { vectorSearch } = require("../services/vectorSearch");
const { generateAnswer } = require("../services/localLLM");
const { fetchUserEnrollments } = require("../services/canvasFetcher");
const { saveQA, searchLearned } = require("../services/learningService");

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("💬 Student question:", message);

    /* ---------- LEARNED KNOWLEDGE ---------- */

const learned = searchLearned(message);

if (learned) {

  console.log("⚡ Using learned knowledge");

  return res.json({
    reply: learned
  });

}

    /* -------------------------------------------------- */
    /* 1️⃣ Static ECCU Knowledge */
    /* -------------------------------------------------- */

    const knowledgeAnswer = searchKnowledge(message);

    if (knowledgeAnswer) {
      return res.json({
        source: "knowledge-store",
        reply: knowledgeAnswer
      });
    }

    /* -------------------------------------------------- */
    /* 2️⃣ Fetch user's Canvas enrollments */
    /* -------------------------------------------------- */

    const enrollments = await fetchUserEnrollments();

    if (!enrollments || !enrollments.length) {
      return res.json({
        source: "enrollment-check",
        reply: "No active enrollments found for this user."
      });
    }

    /* -------------------------------------------------- */
    /* 3️⃣ Extract allowed course IDs */
    /* -------------------------------------------------- */

    const allowedCourseIds = enrollments
      .filter(e => e.enrollment_state === "active")
      .map(e => e.course_id);

    if (!allowedCourseIds.length) {
      return res.json({
        source: "enrollment-check",
        reply: "No active course enrollments found."
      });
    }

    console.log("🎓 Allowed Courses:", allowedCourseIds);

/* -------------------------------------------------- */
    /* intent detection */
    /* -------------------------------------------------- */
    
const { detectIntent } = require("../services/intentDetector");

const intent = detectIntent(message);

console.log("Detected intent:", intent);



    /* ------------------------------------ */
/* Vector Search (RAG) */
/* ------------------------------------ */

const ragResult = await vectorSearch(
  message,
  allowedCourseIds,
  intent
);

if (ragResult) {

  const finalAnswer = await generateAnswer(
  message,
  ragResult.context
);

  /* ---------- AUTO LEARNING ---------- */

  if (finalAnswer && finalAnswer.length > 50 && ragResult.confidence > 0.6) {
    saveQA(message, finalAnswer);
    console.log("🧠 Learned new Q&A");
  }

  return res.json({
    source: "rag+ollama",
    reply: finalAnswer,
    confidence: ragResult.confidence
  });
}

    /* -------------------------------------------------- */
    /* 5️⃣ Fallback */
    /* -------------------------------------------------- */

    return res.json({
      source: "fallback",
      reply: "I couldn't find relevant content in your enrolled courses."
    });

  } catch (err) {

    console.error("❌ Chat error:", err);

    res.status(500).json({
      error: err.toString()
    });
  }
});

module.exports = router;