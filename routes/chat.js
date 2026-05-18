const express = require("express");
const router = express.Router();


const { searchKnowledge } = require("../services/eccuResponder");
const { vectorSearch } = require("../services/vectorSearch");
const { generateAnswer } = require("../services/localLLM");
const { fetchUserEnrollments } = require("../services/canvasFetcher");
const { saveQA, searchLearned } = require("../services/learningService");
const { getLibraryResources } = require("../services/lirnResources");
const {
  trustedWebSearch
} = require("../services/trustedWebSearch");
const { detectIntent } = require("../services/intentDetector");
const {
  getMemory,
  saveMemory
} = require("../services/memoryStore");
const lirnResources = getLibraryResources(message);

router.post("/", async (req, res) => {
  try {
    const {
  message,
  currentPage,
  pageText,
  lastAnswer
} = req.body;

const pageUrl = currentPage?.url || "";
const pageTitle = currentPage?.title || "";
const fullPageText =
  currentPage?.text || pageText || "";

console.log("📄 Page Title:", pageTitle);
console.log("🔗 Page URL:", pageUrl);

const isSyllabusPage =
  pageUrl.toLowerCase().includes("syllabus") ||
  pageTitle.toLowerCase().includes("syllabus") ||
  fullPageText.toLowerCase().includes("course syllabus");

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

/* 📘 PAGE-AWARE SYLLABUS DETECTION */

if (
  isSyllabusPage &&
  message.toLowerCase().includes("syllabus")
) {
  return res.json({
    source: "page-aware",
    reply:
      "You are currently on the course syllabus page. Please click the View button in the syllabus section to access the syllabus document."
  });
}


    /* ------------------------------------ */
/* Vector Search (RAG) */
/* ------------------------------------ */

console.log("📄 PAGE TITLE:", pageTitle);
console.log("🔗 PAGE URL:", pageUrl);
console.log("📚 PAGE TEXT SAMPLE:", fullPageText.slice(0, 1000));

const contextualMessage = `
CURRENT PAGE TITLE:
${pageTitle}

CURRENT PAGE URL:
${pageUrl}

CURRENT PAGE CONTENT:
${fullPageText}

USER QUESTION:
${message}
`;

const ragResult = await vectorSearch(
  contextualMessage,
  allowedCourseIds,
  intent,
  currentPage
);

console.log("📚 RAG RESULT:", ragResult);
let combinedContext = "";

if (fullPageText && fullPageText.length > 500) {

  console.log("✅ TRYING PAGE CONTEXT");

  combinedContext += `
PAGE TITLE:
${pageTitle}

PAGE CONTENT:
${fullPageText.slice(0, 12000)}
`;

  try {

    const webResources = await trustedWebSearch(message);

    combinedContext += `
WEB SEARCH RESULTS:
${JSON.stringify(webResources, null, 2)}
`;

    const pageReply = await generateAnswer(
      message,
      combinedContext
    );

    console.log("🧠 PAGE REPLY:", pageReply);

    if (
      pageReply &&
      typeof pageReply === "string" &&
      pageReply.trim().length > 20
    ) {

      return res.json({
        source: "page-context",
        reply: pageReply
      });

    }

    console.log("⚠️ Empty page reply — falling back to RAG");

  } catch (err) {

    console.log("❌ PAGE CONTEXT ERROR:", err);

  }
}

/* ---------- FALLBACK HANDLING ---------- */

const supportKeywords = [
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

  combinedContext += `

WEB SEARCH RESULTS:
${JSON.stringify(webResources, null, 2)}
`;

const finalContext = `
${combinedContext}

CURRENT CANVAS PAGE:
${pageText || "No page content available"}

CURRENT PAGE URL:
${currentPage?.url || "Unknown"}

ECCU COURSE CONTENT:
${ragResult?.context || ""}
`;

const finalAnswer = await generateAnswer(
  message,
  finalContext,
  intent
);

const shouldShowResources =
  intent === "general" &&
  !finalAnswer.toLowerCase().includes("cannot provide") &&
  webResources &&
  webResources.length > 0;

  let completeResponse = finalAnswer;

  /* -------------------------------------------------- */
/* 📚 LIRN LIBRARY RESOURCES */
/* -------------------------------------------------- */

console.log("📚 LIRN:", lirnResources);

if (lirnResources && lirnResources.length > 0) {

  completeResponse += `

LIRN LIBRARY RESOURCES:

${lirnResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}
`;

}

if (shouldShowResources) {

  const resourcesText = webResources
    .map((r, i) => `
• ${r.title}
${r.url}
`)
    .join("\n\n");

  completeResponse += `

Trusted Resources:
${resourcesText}
`;
}





/* ---------- AUTO LEARNING ---------- */

if (finalAnswer && finalAnswer.length > 50 && ragResult.confidence > 0.5) {
  saveQA(message, finalAnswer);
  console.log("🧠 Learned new Q&A");
}

/* ---------- RESPONSE ---------- */

return res.json({
  source: "rag+liveweb",
  reply: completeResponse,
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