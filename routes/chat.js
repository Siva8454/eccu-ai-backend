const express = require("express");
const router = express.Router();


const { searchKnowledge } = require("../services/eccuResponder");
const { vectorSearch } = require("../services/vectorSearch");
const { generateAnswer } = require("../services/localLLM");
const { fetchUserEnrollments } = require("../services/canvasFetcher");
const { saveQA, searchLearned } = require("../services/learningService");
const {
  trustedWebSearch
} = require("../services/trustedWebSearch");
const { detectIntent } = require("../services/intentDetector");
const {
  getMemory,
  saveMemory
} = require("../services/memoryStore");

router.post("/", async (req, res) => {
  try {
    const {
  message,
  currentPage,
  lastAnswer
} = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("💬 Student question:", message);

    /* -------------------------------------------------- */
/* 🧠 MEMORY USER */
/* -------------------------------------------------- */

const userId =
  req.body.userId || "default-user";

/* -------------------------------------------------- */
/* 🧠 LOAD MEMORY */
/* -------------------------------------------------- */

const memory = getMemory(userId);

const previousQuestion =
  memory?.previousQuestion || "";

const previousMemoryAnswer =
  memory?.lastAnswer || "";

console.log("🧠 Previous question:", previousQuestion);

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
    


const intent = detectIntent(message);

console.log("Detected intent:", intent);

/* -------------------------------------------------- */
/* 🚫 RESTRICTED / EXAM GUARDRAIL */
/* -------------------------------------------------- */

if (intent === "restricted") {
  console.log("🚫 Blocked restricted query");

  return res.json({
    source: "guardrail",
    reply: "Providing answers for exams or assessments is prohibited. Please refer to your course materials or contact your instructor."
  });
}



    /* ------------------------------------ */
/* Vector Search (RAG) */
/* ------------------------------------ */

const ragResult = await vectorSearch(
  message,
  allowedCourseIds,
  intent,
  currentPage   // ⭐ PASS THIS
);



/* ---------- FALLBACK HANDLING ---------- */

const supportKeywords = [
  "lab",
  "assignment",
  "submit",
  "submission",
  "ebook",
  "popup",
  "login",
  "access",
  "not opening",
  "error",
  "issue",
  "problem"
];

const isSupportQuery = supportKeywords.some(k =>
  message.toLowerCase().includes(k)
);

/* ---------- WEAK / NO CONTEXT ---------- */

if (!ragResult || !ragResult.context || ragResult.context.length < 80) {

  console.log("⚠ Weak or no context");

  /* SUPPORT FALLBACK */

  if (isSupportQuery) {
    return res.json({
      source: "support-fallback",
      reply: "Please contact the ECCU support team for assistance with this issue."
    });
  }

  /* CONTENT FALLBACK */

  return res.json({
    source: "content-fallback",
    reply: "This topic is not available in your course materials. Please connect with your instructor for further clarification."
  });
}

/* ---------- GENERATE AI ANSWER ---------- */

const webResources =
  await trustedWebSearch(message);

const finalContext = `
ECCU CONTENT:
${ragResult.context}

TRUSTED ONLINE RESOURCES:
${webResources}
`;

const finalAnswer = await generateAnswer(
  message,
  finalContext,
  intent
);

/* ---------- AUTO LEARNING ---------- */

if (finalAnswer && finalAnswer.length > 50 && ragResult.confidence > 0.5) {
  saveQA(message, finalAnswer);
  console.log("🧠 Learned new Q&A");
}

/* ---------- RESPONSE ---------- */

return res.json({
  source: "rag+groq",
  reply: finalAnswer,
  confidence: ragResult.confidence
});

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