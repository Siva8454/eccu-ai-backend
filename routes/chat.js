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

const isTechnicalIssue =
  require("../utils/isTechnicalIssue");

/* ===================================== */
/* EDUCATIONAL TOPIC DETECTION */
/* ===================================== */

function isEducationalTopic(query = "") {

  const text = query.toLowerCase();

  return (
    text.includes("what is") ||
    text.includes("explain") ||
    text.includes("define") ||
    text.includes("difference") ||
    text.includes("how does") ||
    text.includes("why") ||
    text.includes("describe") ||
    text.includes("compare") ||
    text.includes("discuss")
  );

}

function isGreeting(message = "") {

  const text = message.trim().toLowerCase();

  return [

    "hi",
    "hello",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "how are you",
    "thanks",
    "thank you"

  ].includes(text);

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
  pageText,
  history,
  userId,
  courseId,
  courseCode,
  courseName
} = req.body;

const helpUrl =
  `https://eccouncil.instructure.com/courses/${courseId}/pages/help`;

const currentCourse =
  detectCourse(courseCode);

  if (!currentCourse) {
  return res.json({
    source: "course-detection",
    reply:
      `Course configuration not found for ${courseCode}.`
  });
}

console.log("Course Code:", courseCode);
console.log("Course Name:", courseName);
console.log("Detected Course:", currentCourse?.courseName);
console.log("CURRENT COURSE:", currentCourse);

    if (!message) {

      return res.status(400).json({
        error: "Message is required"
      });

    }

    console.log("💬 Student question:", message);

    /* ===================================== */
    /* MEMORY */
    /* ===================================== */

    const currentUserId =
  userId || "default-user";

    const memory =
  getMemory(currentUserId);

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

if (isGreeting(message)) {

  return res.json({

    source: "greeting",

    reply: `Hello! I'm your ECCU AI Tutor.

I can help you with course concepts, assignments, labs, discussions, module content, and learning materials related to ${currentCourse.courseName}.`

  });

}

/* ===================================== */
/* QUICK ACTIONS */
/* ===================================== */

const quickAction =
  message.trim().toLowerCase();

  console.log("Quick Action:", quickAction);

if (
  quickAction === "course / topic" ||
  quickAction === "course/topic"
) {

  return res.json({

    source: "quick-action",

    reply: `You are currently enrolled in ${currentCourse.courseName}.

I can help explain:

• Course concepts
• Module content
• Assignments
• Discussions
• Labs
• Research projects

Ask any course-related question and I'll help you understand the material.`

  });

}

if (quickAction === "labs") {

  return res.json({

    source: "quick-action",

    reply:
      "Tell me which lab you need help with, or ask me to explain the lab instructions on the current page."

  });

}

if (
  quickAction === "assignments / research project / case study"
) {

  return res.json({

    source: "quick-action",

    reply:
      "Tell me which assignment or research project you need help with, or ask me to explain the current assignment page."

  });

}

if (
  quickAction === "help & support" ||
  quickAction === "help/support"
) {

  return res.json({

    source: "quick-action",

    reply:
      "I can help explain course content, assignments, labs, discussions, navigation, and general course-related questions."

  });

}

if (quickAction === "other") {

  return res.json({

    source: "quick-action",

    reply:
      "Ask any course-related question and I'll do my best to help."

  });

}


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

    Greetings, introductions, thanks, and normal conversation
    messages such as:

    Hi
    Hello
    Hey
    Good morning
    Thank you

    should be considered RELATED.

    Only questions clearly outside the course subject
should be marked NOT_RELATED.

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

    const recentHistory = (history || [])
  .slice(-6)
  .map(h => `${h.role}: ${h.content}`)
  .join("\n");

const contextualMessage = `

CONVERSATION HISTORY:
${recentHistory}

CURRENT QUESTION:
${message}

`;

const shouldUseRAG =
  !!currentPage ||
  message.toLowerCase().includes("module") ||
  message.toLowerCase().includes("assignment") ||
  message.toLowerCase().includes("discussion") ||
  message.toLowerCase().includes("quiz") ||
  message.toLowerCase().includes("lab") ||
  message.length > 20;

    let ragResult = {
  context: "",
  confidence: 0
};

if (shouldUseRAG) {

  ragResult =
    await vectorSearch(
      contextualMessage,
      allowedCourseIds,
      intent,
      currentPage
    );

}

    

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */

    let webResources = [];

    const shouldSearch =
  !isGreeting(message) &&
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
  currentPage?.text?.slice(0, 5000) || "",

  extraContext:
  finalContext?.slice(0, 5000) || ""

};
  const isClarification =
    /explain it|explain this|simplify|i don't understand|i didnt understand|i didn't understand/i
      .test(message);

  if (isClarification && currentPage?.text) {

    structuredContext.currentPage =
      currentPage.text;

  }

    const aiAnswer =
  await generateAnswer(
    contextualMessage,
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

/(\*\*)?(sources|references|additional resources|course reference|online resources|further reading|resources|citations|additional tips)(\*\*)?\s*:?\s*[\s\S]*$/i,

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
      !isGreeting(message) &&
      !isClarification &&
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

   

    let finalAnswer = completeResponse;

if (isTechnicalIssue(message)) {

  const helpUrl =
    `https://eccouncil.instructure.com/courses/${courseId}/pages/help`;

  finalAnswer += `

---

If the issue is still not resolved after following the troubleshooting steps, please visit the course Help page:

${helpUrl}

The Help page contains:
• FAQs
• Report Course Issues
• Support Contact Information

`;
}

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