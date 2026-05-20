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

const {
  detectIntent
} = require("../services/intentDetector");

const {
  getMemory,
  saveMemory
} = require("../services/memoryStore");

/* ===================================== */
/* EDUCATIONAL TOPIC DETECTION */
/* ===================================== */

function isEducationalTopic(query = "") {

  const text = query.toLowerCase();

  const keywords = [

    "what is",
    "explain",
    "define",
    "difference",
    "how does",

    "sql injection",
    "xss",
    "csrf",
    "phishing",
    "malware",
    "ransomware",

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
    "penetration testing",

    "ids",
    "ips",
    "siem",
    "soc"

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

      r.url &&
      r.url.startsWith("http") &&

      !text.includes("404") &&
      !text.includes("not found") &&
      !text.includes("homepage") &&
      !text.includes("admission") &&
      !text.includes("apply now") &&
      !text.includes("course catalog") &&
      !text.includes("degree") &&
      !text.includes("certification") &&
      !text.includes("comptia") &&
      !text.includes("udemy") &&
      !text.includes("coursera") &&
      !text.includes("edx") &&
      !text.includes(".onion") &&
      !text.includes("darkweb")

    );

  });

}

router.post("/", async (req, res) => {

  try {

    const {
      message,
      currentPage,
      pageText
    } = req.body;

    if (!message) {

      return res.status(400).json({
        error: "Message is required"
      });

    }

    console.log("💬 Student question:", message);

    const pageUrl =
      currentPage?.url || "";

    const pageTitle =
      currentPage?.title || "";

    const fullPageText =
      currentPage?.text ||
      pageText ||
      "";

    /* ===================================== */
    /* MEMORY */
    /* ===================================== */

    const userId =
      req.body.userId || "default-user";

    const memory =
      getMemory(userId);

    console.log(
      "🧠 Previous question:",
      memory?.previousQuestion || ""
    );

    /* ===================================== */
    /* LEARNED KNOWLEDGE */
    /* ===================================== */

    const learned =
      searchLearned(message);

    if (learned) {

      return res.json({
        reply: learned
      });

    }

    /* ===================================== */
    /* STATIC KNOWLEDGE */
    /* ===================================== */

    const knowledgeAnswer =
      searchKnowledge(message);

    if (knowledgeAnswer) {

      return res.json({
        source: "knowledge-store",
        reply: knowledgeAnswer
      });

    }

    /* ===================================== */
    /* ENROLLMENTS */
    /* ===================================== */

    const enrollments =
      await fetchUserEnrollments();

    if (!enrollments?.length) {

      return res.json({
        source: "enrollment-check",
        reply:
          "No active enrollments found."
      });

    }

    const allowedCourseIds =
      enrollments
        .filter(e =>
          e.enrollment_state === "active"
        )
        .map(e => e.course_id);

    /* ===================================== */
    /* INTENT */
    /* ===================================== */

    const intent =
      detectIntent(message);

    console.log(
      "Detected intent:",
      intent
    );

    /* ===================================== */
    /* EXAM / CHEATING GUARDRAIL */
    /* ===================================== */

    if (intent === "restricted") {

      return res.json({

        source: "guardrail",

        reply:
          "Providing answers for exams or assessments is prohibited. Please refer to your course materials or contact your instructor."

      });

    }

    /* ===================================== */
    /* LIRN RESOURCES */
    /* ===================================== */

    const lirnResources =
      getLibraryResources(message);

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */

    let webResources = [];

    const shouldSearch = true;

    if (shouldSearch) {

      try {

        webResources =
          await trustedWebSearch(message);

        console.log(
          "🌐 WEB RESOURCES:",
          webResources
        );

      } catch (err) {

        console.log(
          "❌ WEB SEARCH ERROR:",
          err.message
        );

      }
      let webResourcesText = "";

if (
  Array.isArray(webResources) &&
  webResources.length > 0
) {

  webResourcesText =
    "\n\nSupporting Learning Resources:\n\n";

  webResources.forEach(resource => {

    webResourcesText +=
      `• ${resource.title}\n${resource.url}\n\n`;

  });

}

    }

    /* ===================================== */
    /* VECTOR SEARCH */
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

    const ragResult =
      await vectorSearch(
        contextualMessage,
        allowedCourseIds,
        intent,
        currentPage
      );

    /* ===================================== */
    /* WEAK CONTEXT */
    /* ===================================== */

    if (
      !ragResult ||
      !ragResult.context ||
      ragResult.context.length < 80
    ) {

      return res.json({

        source: "content-fallback",

        reply:
          "This topic is not available in your course materials. Please connect with your instructor for further clarification."

      });

    }

    /* ===================================== */
    /* FINAL CONTEXT */
    /* ===================================== */

    const finalContext = `

CURRENT CANVAS PAGE:
${pageText || "No page content available"}

CURRENT PAGE URL:
${currentPage?.url || "Unknown"}

ECCU COURSE CONTENT:
${ragResult?.context || ""}

VERIFIED EDUCATIONAL RESOURCES:

${webResources.map(r =>
`TITLE: ${r.title}`
).join("\n")}

`;

    /* ===================================== */
    /* GENERATE ANSWER */
    /* ===================================== */

    const aiAnswer =
      await generateAnswer(
        message,
        finalContext,
        intent
      );

    /* ===================================== */
    /* CLEAN RESPONSE */
    /* ===================================== */

    let completeResponse =
      aiAnswer || "";

    completeResponse =
      completeResponse.replace(

/(\*\*)?(references|additional resources|course reference|online resources|further reading|resources|citations)(\*\*)?\s*:?\s*[\s\S]*$/i,

""

);

    completeResponse =
      completeResponse
        .replace(/\]\((https?:\/\/.*?)\)/g, "")
        .replace(/\[(.*?)\]\((.*?)\)/g, "$1\n$2");

    /* ===================================== */
    /* WEB LEARNING RESOURCES */
    /* ===================================== */

    const shouldShowResources =

      !completeResponse
        .toLowerCase()
        .includes("cannot provide") &&

      Array.isArray(webResources) &&

      webResources.length > 0 &&

      hasUsefulResources(webResources);

    if (shouldShowResources) {

      console.log(
        "✅ APPENDING WEB RESOURCES"
      );

      const cleanedResources =

        webResources

          .filter(r => {

            const text =
              `${r.title} ${r.url}`.toLowerCase();

            return (

              r.url &&
              r.url.startsWith("http") &&

              !text.includes("404") &&
              !text.includes("not found") &&
              !text.includes("homepage") &&
              !text.includes("admission") &&
              !text.includes("apply now") &&
              !text.includes("course catalog") &&
              !text.includes("degree") &&
              !text.includes("certification") &&
              !text.includes("comptia") &&
              !text.includes("udemy") &&
              !text.includes("coursera") &&
              !text.includes("edx") &&
              !text.includes(".onion") &&
              !text.includes("darkweb")

            );

          })

          .slice(0, 3);

      if (cleanedResources.length > 0) {

        completeResponse += `

---

Supporting Learning Resources

${cleanedResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}

`;

      }

    }

    /* ===================================== */
    /* LIRN RESOURCES */
    /* ===================================== */

    if (
      isEducationalTopic(message) &&
      lirnResources &&
      lirnResources.length > 0
    ) {

      console.log(
        "📚 APPENDING LIRN RESOURCES"
      );

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
      aiAnswer &&
      aiAnswer.length > 50 &&
      ragResult.confidence > 0.5
    ) {

      saveQA(message, aiAnswer);

      console.log(
        "🧠 Learned new Q&A"
      );

    }

    /* ===================================== */
    /* RESPONSE */
    /* ===================================== */

    const finalAnswer =
  completeResponse +
  webResourcesText +
  lirnResources;
    
    
    return res.json({

      source: "rag+liveweb",

      reply: finalAnswer

    });

  }

  catch (err) {

    console.error(
      "❌ Chat error:",
      err
    );

    return res.status(500).json({

      error: err.toString()

    });

  }

});

module.exports = router;