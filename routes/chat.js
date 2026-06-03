const express = require("express");
const router = express.Router();

const { searchKnowledge } = require("../services/eccuResponder");
const { vectorSearch } = require("../services/vectorSearch");
const { generateAnswer } = require("../services/localLLM");
const { fetchUserEnrollments } = require("../services/canvasFetcher");
const { saveQA, searchLearned } = require("../services/learningService");
const { getLibraryResources } = require("../services/lirnResources");
const detectCourse =
  require("../utils/detectCourse");

const {
  trustedWebSearch
} = require("../services/trustedWebSearch");

const {
  detectIntent
} = require("../services/intentDetector");

const {
  getMemory
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

    const currentCourse =
  detectCourse();

console.log(
  "CURRENT COURSE:",
  currentCourse
);

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
    /* COURSE RELEVANCE CHECK */
    /* ===================================== */

    const relevancePrompt = `
    You are an academic course relevance classifier.

    Course:
    ${currentCourse.courseName}

    Student Question:
    ${message}

    Determine whether this question belongs to the academic subject area of this course.

    Examples:

    Course: Psychology
    Question: What is social cognition?
    RELATED

    Course: Psychology
    Question: What is photosynthesis?
    NOT_RELATED

    Course: Psychology
    Question: What is aura farming?
    NOT_RELATED

    Course: Psychology
    Question: Explain attribution theory.
    RELATED

    Respond ONLY with:

    RELATED

    or

    NOT_RELATED
    `;

    const relevanceResult =
      await generateAnswer(
        relevancePrompt,
        {},
        "classifier"
      );

    const isCourseRelated =
      relevanceResult
        ?.trim()
        ?.toUpperCase()
        ?.includes("RELATED") &&
      !relevanceResult
        ?.trim()
        ?.toUpperCase()
        ?.includes("NOT_RELATED");

    console.log(
      "Course relevance:",
      relevanceResult
    );

    if (!isCourseRelated) {

  return res.json({

    source: "course-guardrail",

    reply:
      `This question does not appear to be related to ${currentCourse.courseName}.

      I can assist with course concepts, assignments, labs, discussions, module content, and learning materials related to this course.`

        });

      }
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
    /* VECTOR SEARCH */
    /* ===================================== */

    const contextualMessage = `

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

      console.log(
      "Raw Score:",
      ragResult?.rawScore
    );

    console.log(
      "Boosted Score:",
      ragResult?.confidence
    );

    

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */

    let webResources = [];

    const shouldSearch =
  isEducationalTopic(message) &&
  isCourseRelated;

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

    }

    /* ===================================== */
    /* FINAL CONTEXT */
    /* ===================================== */

    const finalContext = `

ECCU COURSE CONTENT:
${ragResult?.context || ""}

VERIFIED EDUCATIONAL RESOURCES:

${webResources.map(r =>
`• ${r.title}
${r.url}`
).join("\n\n")}

`;

    /* ===================================== */
    /* GENERATE ANSWER */
    /* ===================================== */
const structuredContext = {

  pageTitle:
    currentPage?.pageTitle || "",

  currentPage:
  currentPage?.text?.slice(0, 3000) || "",

  extraContext:
  finalContext?.slice(0, 2500) || ""

};
    const aiAnswer =
  await generateAnswer(
    message,
    structuredContext,
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
      isCourseRelated &&
      isEducationalTopic(message) &&
      lirnResources &&
      lirnResources.length > 0
    ) 
{

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
      completeResponse;

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