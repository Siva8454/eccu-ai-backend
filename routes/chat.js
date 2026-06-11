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

  const {
  logAnalytics
} = require(
  "../services/analyticsService"
);

const {
  isSensitiveQuestion
} = require("../services/securityFilter");

const {
  classifyCourseRelevance
} = require(
  "../services/courseClassifier"
);


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

    text.includes("discuss") ||

    text.includes("example") ||

    text.includes("examples") ||

    text.includes("provide examples") ||

    text.includes("give examples") ||

    text.includes("sample") ||

    text.includes("illustrate") ||

    text.includes("overview") ||

    text.includes("summarize") ||

    text.includes("summary") ||

    text.includes("help me understand") ||

    text.includes("explain this")

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

    const startTime = Date.now();

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

  const previousQuestion =
  memory?.previousQuestion || "";

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

   console.log(
  "Previous Question:",
  previousQuestion
);
   
    const isCourseRelated =
  await classifyCourseRelevance(
    currentCourse.courseName,
    message,
    previousQuestion
  );

  console.log(
    "Current Course:",
    currentCourse.courseName
  );

  console.log(
    "Student Question:",
    message
  );

  console.log(
    "Course Related:",
    isCourseRelated
  );

  const q = message.toLowerCase();

  /* ============================= */
/* COURSE-WIDE LAB QUESTIONS */
/* ============================= */

const wantsLabs =

  q.includes("lab") ||
  q.includes("labs") ||
  q.includes("skillable") ||
  q.includes("hands-on") ||
  q.includes("exercise");

  const wantsLabExplanation =

  q.includes("what is this lab") ||
  q.includes("explain this lab") ||
  q.includes("summarize this lab") ||
  q.includes("what do i need to do") ||
  q.includes("what is this assignment") ||
  q.includes("tell me about this lab") ||
  q.includes("describe this lab") ||
  q.includes("explain this activity") ||
  q.includes("explain this assignment");

 /* ========================= */
/* MODULE LAB CHECK */
/* ========================= */

if (
  wantsLabs &&
  !wantsLabExplanation &&
  currentPage
) {

  let labs = [];

  /* ---------- FIRST: CHECK PAGE LINKS ---------- */

  if (currentPage.links?.length) {

    labs = currentPage.links
      .map(link => (link.text || "").trim())
      .filter(text => {

        const t = text.toLowerCase();

        return (
          t.includes("lab") ||
          t.includes("labs")
        );

      });

  }

  /* ---------- FALLBACK: CHECK PAGE TEXT ---------- */

  if (!labs.length && currentPage.text) {

    labs = [...new Set([

      ...currentPage.text.matchAll(/\b[a-zA-Z0-9()\- ]*lab[s]?[a-zA-Z0-9()\- ]*/gi)

    ]
      .map(m => m[0].trim())
      .filter(Boolean))];

  }

  /* ---------- REMOVE DUPLICATES ---------- */

  labs = [...new Set(labs)];

  console.log("LABS FOUND:", labs);

  if (labs.length) {

    return res.json({
      source: "page",
      reply:
`The following lab activities are available in this module:

${labs.map(x => `• ${x}`).join("\n")}

These lab activities can be accessed from the Learning Materials section of the module.`
    });

  }

}

  /* ============================= */
/* SYLLABUS QUESTIONS */
/* ============================= */

  const wantsSyllabus =
  q.includes("syllabus") ||
  q.includes("whole course") ||
  q.includes("entire course") ||
  q.includes("full course");

if (wantsSyllabus) {

  return res.json({
    source: "navigation",
    reply:
      `The complete course syllabus is available here:

https://eccouncil.instructure.com/courses/${courseId}/assignments/syllabus`
  });

}


if (
  !isCourseRelated &&
  (
    q.includes("act as") ||
    q.includes("pretend to be") ||
    q.includes("roleplay") ||
    q.includes("you are a")
  )
)
{

  return res.json({
    source: "course-guardrail",
    reply:
      "Please ask a question related to the current course content."
  });

}


    if (isSensitiveQuestion(message)) {

  return res.json({

    source: "security",

    reply:
      "This request is outside the scope of the ECCU AI Tutor. I can only assist with course-related learning content."

  });

}

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

    const isFollowUp =
/explain( this)?|simplify|tell me more|i don't understand|i didnt understand|give examples?|example|elaborate|continue/i
.test(message);

    const recentHistory = isFollowUp
  ? (history || [])
      .slice(-2)
      .map(h => `${h.role}: ${h.content}`)
      .join("\n")
  : "";

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
    message,
    [Number(courseId)],
    intent,
    currentPage,
    wantsLabs
  );

}

    

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */

let webResources = [];

let skipWebSearch = false;

const needsExternalResources =

  message.toLowerCase().includes("resource") ||

  message.toLowerCase().includes("resources") ||

  message.toLowerCase().includes("reference") ||

  message.toLowerCase().includes("references") ||

  message.toLowerCase().includes("real world") ||

  message.toLowerCase().includes("example") ||

  message.toLowerCase().includes("examples") ||

  message.toLowerCase().includes("case study") ||

  message.toLowerCase().includes("case studies") ||

  message.toLowerCase().includes("latest") ||

  message.toLowerCase().includes("current") ||

  message.toLowerCase().includes("trend") ||

  message.toLowerCase().includes("research");

/*
HIGH CONFIDENCE COURSE CONTENT
=
Do NOT search the web if
the module/page already contains
enough information.
*/

if (

  ragResult?.confidence >= 0.75 &&

  (
    currentPage?.text?.length > 500 ||
    ragResult?.context?.length > 1000
  ) &&

  !needsExternalResources

) {

  skipWebSearch = true;

  console.log(
    "✅ Skipping web search - strong ECCU content found"
  );

}

const pageSpecificQuestion =

  !!currentPage?.text ||

  message.toLowerCase().includes("this module") ||
  message.toLowerCase().includes("this page") ||
  message.toLowerCase().includes("this assignment") ||
  message.toLowerCase().includes("this discussion") ||
  message.toLowerCase().includes("this lab") ||
  message.toLowerCase().includes("from this module") ||
  message.toLowerCase().includes("from this page");

if (
  pageSpecificQuestion &&
  !needsExternalResources
) {

  skipWebSearch = true;

}


if (needsExternalResources) {

  skipWebSearch = false;

  console.log(
    "🌐 Forcing web search for enrichment request"
  );

}

const shouldSearch =

  !skipWebSearch &&

  !isGreeting(message) &&

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

logAnalytics({

  courseId,
  courseCode,

  userId: currentUserId,

  question: message,

  intent,

  source: "rag+liveweb",

  responseTime:
    Date.now() - startTime,

  confidence:
    ragResult?.confidence || 0

});

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