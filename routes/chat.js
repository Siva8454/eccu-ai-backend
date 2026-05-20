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

/* ===================================== */
/* EDUCATIONAL TOPIC DETECTION */
/* ===================================== */

function isEducationalTopic(query) {

  const text = query.toLowerCase();

  const keywords = [

    "what is",
    "explain",
    "define",
    "difference",
    "how does",
    "sql injection",
    "xss",
    "phishing",
    "malware",
    "cybersecurity",
    "network",
    "firewall",
    "encryption",
    "linux",
    "ethical hacking",
    "vulnerability",
    "attack",
    "threat",
    "risk",
    "authentication",
    "authorization",
    "cloud security",
    "penetration testing"

  ];

  return keywords.some(keyword =>
    text.includes(keyword)
  );
}

/* ===================================== */
/* VALID RESOURCE CHECK */
/* ===================================== */

function hasUsefulResources(resources = []) {

  if (!resources.length) return false;

  return resources.some(r => {

    const text =
      `${r.title} ${r.url}`.toLowerCase();

    return (

      !text.includes("top 10") &&
      !text.includes("cyberframework") &&
      !text.includes("homepage") &&
      !text.includes("admission") &&
      !text.includes("degree") &&
      !text.includes("apply now") &&
      !text.includes("course catalog") &&
      !text.includes("certification") &&

      r.url &&
      r.url.startsWith("http")

    );

  });

}

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

      return res.status(400).json({
        error: "Message is required"
      });

    }

    console.log("💬 Student question:", message);

    /* ===================================== */
    /* MEMORY */
    /* ===================================== */

    const userId =
      req.body.userId || "default-user";

    const memory = getMemory(userId);

    const previousQuestion =
      memory?.previousQuestion || "";

    console.log("🧠 Previous question:", previousQuestion);

    /* ===================================== */
    /* LEARNED KNOWLEDGE */
    /* ===================================== */

    const learned = searchLearned(message);

    if (learned) {

      console.log("⚡ Using learned knowledge");

      return res.json({
        reply: learned
      });

    }

    /* ===================================== */
    /* STATIC ECCU KNOWLEDGE */
    /* ===================================== */

    const knowledgeAnswer = searchKnowledge(message);

    if (knowledgeAnswer) {

      return res.json({
        source: "knowledge-store",
        reply: knowledgeAnswer
      });

    }

    /* ===================================== */
    /* FETCH ENROLLMENTS */
    /* ===================================== */

    const enrollments =
      await fetchUserEnrollments();

    if (!enrollments || !enrollments.length) {

      return res.json({
        source: "enrollment-check",
        reply: "No active enrollments found for this user."
      });

    }

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

    /* ===================================== */
    /* INTENT DETECTION */
    /* ===================================== */

    const intent = detectIntent(message);

    console.log("Detected intent:", intent);

    /* ===================================== */
    /* RESTRICTED / EXAM GUARDRAIL */
    /* ===================================== */

    if (intent === "restricted") {

      console.log("🚫 Blocked restricted query");

      return res.json({
        source: "guardrail",
        reply:
          "Providing answers for exams or assessments is prohibited. Please refer to your course materials or contact your instructor."
      });

    }

    /* ===================================== */
    /* PAGE-AWARE SYLLABUS */
    /* ===================================== */

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

    /* ===================================== */
    /* CONTEXTUAL MESSAGE */
    /* ===================================== */

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

    const lirnResources =
      getLibraryResources(message);

    console.log(
      "LIRN RESOURCES:",
      JSON.stringify(lirnResources, null, 2)
    );

    const ragResult = await vectorSearch(
      contextualMessage,
      allowedCourseIds,
      intent,
      currentPage
    );

    console.log("📚 RAG RESULT:", ragResult);

    let combinedContext = "";

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */

    let webResources = [];

    const shouldSearch =
      isEducationalTopic(message);

    if (shouldSearch) {

      webResources =
        await trustedWebSearch(message);

    }

    /* ===================================== */
    /* PAGE CONTEXT */
    /* ===================================== */

    if (
      fullPageText &&
      fullPageText.length > 500
    ) {

      console.log("✅ TRYING PAGE CONTEXT");

      combinedContext += `
PAGE TITLE:
${pageTitle}

PAGE CONTENT:
${fullPageText.slice(0, 12000)}
`;

      combinedContext += `
VERIFIED EDUCATIONAL RESOURCES:

${webResources.map(r =>
`TITLE: ${r.title}`
).join("\n")}
`;

      try {

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

          let pageCompleteResponse = pageReply;

          /* REMOVE AI REFERENCES */

          pageCompleteResponse =
            pageCompleteResponse.replace(

/(\*\*)?(references|additional resources|course reference|online resources|further reading|resources|citations)(\*\*)?\s*:?\s*[\s\S]*$/i,

""

);

          /* REMOVE BROKEN MARKDOWN */

          pageCompleteResponse =
            pageCompleteResponse
              .replace(/\]\((https?:\/\/.*?)\)/g, "")
              .replace(/\[(.*?)\]\((.*?)\)/g, "$1\n$2");

          /* DDG RESOURCES */

          if (
            webResources &&
            hasUsefulResources(webResources)
          ) {

            pageCompleteResponse += `

Additional learning resources are available below:

${webResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}
`;

          }

          /* LIRN RESOURCES */

          if (
            intent === "general" &&
            lirnResources &&
            lirnResources.length > 0
          ) {

            pageCompleteResponse += `

Search the following LIRN Library resources for more information on this topic:

${lirnResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}
`;

          }

          return res.json({
            source: "page-context",
            reply: pageCompleteResponse
          });

        }

      } catch (err) {

        console.log("❌ PAGE CONTEXT ERROR:", err);

      }

    }

    /* ===================================== */
    /* SUPPORT FALLBACK */
    /* ===================================== */

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

    const isSupportQuery =
      supportKeywords.some(k =>
        message.toLowerCase().includes(k)
      );

    /* ===================================== */
    /* WEAK CONTEXT */
    /* ===================================== */

    if (
      !ragResult ||
      !ragResult.context ||
      ragResult.context.length < 80
    ) {

      console.log("⚠ Weak or no context");

      if (isSupportQuery) {

        return res.json({
          source: "support-fallback",
          reply:
            "Please contact the ECCU support team for assistance with this issue."
        });

      }

      return res.json({
        source: "content-fallback",
        reply:
          "This topic is not available in your course materials. Please connect with your instructor for further clarification."
      });

    }

    /* ===================================== */
    /* FINAL CONTEXT */
    /* ===================================== */

    combinedContext += `
VERIFIED EDUCATIONAL RESOURCES:

${webResources.map(r =>
`TITLE: ${r.title}`
).join("\n")}
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

    const finalAnswer =
      await generateAnswer(
        message,
        finalContext,
        intent
      );

    const shouldShowResources =

      intent === "general" &&

      !finalAnswer
        .toLowerCase()
        .includes("cannot provide") &&

      hasUsefulResources(webResources);

    let completeResponse = finalAnswer;

    console.log("BEFORE APPEND");
    console.log("LIRN LENGTH:", lirnResources.length);

    /* REMOVE AI REFERENCES */

    completeResponse =
      completeResponse.replace(

/(\*\*)?(references|additional resources|course reference|online resources|further reading|resources|citations)(\*\*)?\s*:?\s*[\s\S]*$/i,

""

);

    /* REMOVE BROKEN MARKDOWN */

    completeResponse =
      completeResponse
        .replace(/\]\((https?:\/\/.*?)\)/g, "")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1\n$2");

    /* DDG RESOURCES */

    if (shouldShowResources) {

      const resourcesText =
        webResources
          .map((r) =>
`• ${r.title}
${r.url}`
          )
          .join("\n\n");

      completeResponse += `

Additional learning resources are available below:

${resourcesText}
`;

    }

    /* LIRN RESOURCES */

    if (
      intent === "general" &&
      lirnResources &&
      lirnResources.length > 0
    ) {

      console.log("APPENDING LIRN RESOURCES");

      completeResponse += `

Search the following LIRN Library resources for more information on this topic:

${lirnResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}
`;

    }

    /* ===================================== */
    /* AUTO LEARNING */
    /* ===================================== */

    if (
      finalAnswer &&
      finalAnswer.length > 50 &&
      ragResult.confidence > 0.5
    ) {

      saveQA(message, finalAnswer);

      console.log("🧠 Learned new Q&A");

    }

    /* ===================================== */
    /* RESPONSE */
    /* ===================================== */

    return res.json({
      source: "rag+liveweb",
      reply: completeResponse,
    });

  } catch (err) {

    console.error("❌ Chat error:", err);

    res.status(500).json({
      error: err.toString()
    });

  }

});

module.exports = router;