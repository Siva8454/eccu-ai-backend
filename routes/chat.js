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
    detectCourse(courseCode, courseId);

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

  /* ========================= */
/* COURSEWIDE CHECK */
/* ========================= */
const wantsCourseWideSearch =

/course|entire course|throughout the course|all modules|research project|research projects|project|projects|instructor|professor|faculty|syllabus|grading|grade policy|late policy|final exam|course summary|module summary|summary of module|how many/i
.test(q);

  /* ============================= */
/* COURSE-WIDE Interactivity Questions */
/* ============================= */

const isInteractivityPage =

  currentPage?.title?.toLowerCase().includes("interactivity") ||

  currentPage?.url?.toLowerCase().includes("interactivity");

const wantsInteractivityExplanation =

  q.includes("what is this interactivity") ||
  q.includes("explain this interactivity") ||
  q.includes("tell me about this interactivity") ||
  q.includes("what does this interactivity do") ||
  q.includes("describe this interactivity") ||
  q.includes("what is this activity") ||
  q.includes("explain this activity") ||

  (
    isInteractivityPage &&
    (
      q.includes("what is this") ||
      q.includes("explain this") ||
      q.includes("tell me about this") ||
      q.includes("what is this page") ||
      q.includes("tell me about this page") ||
      q.includes("what do i do here") ||
      q.includes("what do i need to do") ||
      q.includes("how do i complete this")
    )
  );

  

  /* ============================= */
/* COURSE-WIDE LAB QUESTIONS */
/* ============================= */

  const wantsLabs =

  /\blabs?\b/i.test(q) ||
  q.includes("lab assignment");

  const wantsLabExplanation =

/(explain|summarize|describe|understand|help).*(lab|assignment|activity|instructions|current page)/i
.test(q)

||

q.includes("what is this lab") ||
q.includes("tell me about this lab") ||
q.includes("describe this lab") ||
q.includes("what do i need to do") ||
q.includes("explain the lab instructions") ||
q.includes("explain the instructions") ||
q.includes("explain the current page");

const wantsCourseStatistics =

/how many/i.test(q)

&&

(
  q.includes("research project") ||
  q.includes("research projects") ||

  q.includes("lab assignment") ||
  q.includes("lab assignments") ||
  q.includes("labs") ||

  q.includes("discussion") ||
  q.includes("discussions") ||

  q.includes("written assignment") ||
  q.includes("written assignments") ||

  q.includes("case study") ||
  q.includes("case studies") ||

  q.includes("quiz") ||
  q.includes("quizzes") ||

  q.includes("exam") ||
  q.includes("exams") ||

  q.includes("interactivity") ||
  q.includes("interactive") ||
  q.includes("interactivities")
);

if (wantsCourseStatistics) {

  let searchTerm = "";
  let label = "";

  if (
    q.includes("research project") ||
    q.includes("research projects")
  ) {
    searchTerm = "research project";
    label = "research projects";
  }

  else if (
    q.includes("lab assignment") ||
    q.includes("lab assignments") ||
    q.includes("labs")
  ) {
    searchTerm = "lab assignment";
    label = "lab assignments";
  }

  else if (
    q.includes("discussion") ||
    q.includes("discussions")
  ) {
    searchTerm = "discussion";
    label = "discussions";
  }

  else if (
    q.includes("written assignment") ||
    q.includes("written assignments")
  ) {
    searchTerm = "written assignment";
    label = "written assignments";
  }

  else if (
    q.includes("case study") ||
    q.includes("case studies")
  ) {
    searchTerm = "case study";
    label = "case studies";
  }

  else if (
    q.includes("quiz") ||
    q.includes("quizzes")
  ) {
    searchTerm = "quiz";
    label = "quizzes";
  }

  else if (
    q.includes("exam") ||
    q.includes("exams") ||
    q.includes("final exam") ||
    q.includes("mock exam")
  ) {
    searchTerm = "exam";
    label = "exams";
  }

  else if (
    q.includes("interactivity") ||
    q.includes("interactive") ||
    q.includes("interactivities")
  ) {
    searchTerm = "interactivity";
    label = "interactive activities";
  }

  const result = await vectorSearch(
    searchTerm,
    [Number(courseId)],
    intent,
    null,
    false,
    true
  );

  const count =
    (result.context.match(
      new RegExp(searchTerm, "gi")
    ) || []).length;

  return res.json({
    reply: `I found approximately ${count} ${label} in this course.`
  });
}

  const wantsLabSolution =

/(show me the answer|give me the answer|solve this lab|complete this for me|walk me through every step|step by step solution|task answer|expected output)/i.test(q)

||

/task\s*\d+/i.test(q)

||

/lab\s*\d+/i.test(q);

const wantsLabGuidance =

/(how to do|how to complete|what do i do|what should i do|how do i start|how do i begin|how to switch|cannot switch|can't switch|unable to switch|i do not know how to|i don't know how to|where do i find|how do i access|how do i launch|how do i open)/i
.test(q);

// DEBUG
console.log("wantsLabs:", wantsLabs);
console.log("wantsLabExplanation:", wantsLabExplanation);
console.log("wantsLabSolution:", wantsLabSolution);
console.log("wantsLabGuidance:", wantsLabGuidance);
console.log("Question:", q);
console.log(
  "wantsCourseWideSearch:",
  wantsCourseWideSearch
);

 /* ========================= */
/* LAB LAUNCH PAGE CHECK */
/* ========================= */

const pageContent = `
${currentPage?.text || ""}
${pageText || ""}
`;

const isLabLaunchPage =
  currentPage?.text?.includes(
    "This tool needs to be loaded in a new browser window"
  ) ||
  currentPage?.text?.includes(
    "The session for this tool has expired"
  );

// Only block educational questions on the launcher page.
// Let technical issues continue to the AI.
console.log("isLabLaunchPage:", isLabLaunchPage);
console.log("isTechnicalIssue:", isTechnicalIssue(message));
console.log("Message:", message);

if (isLabLaunchPage && !isTechnicalIssue(message)) {

    console.log("RETURNING LAB PAGE RESPONSE");

    return res.json({

    source: "lab-launch-page",

    reply: `I can see that you are currently on the lab launcher page.

This page is used only to launch the lab environment.

Please return to the previous page and ask your question there so I can access the lab instructions and provide more accurate assistance.`

  });

}

  console.log({
  wantsLabs,
  wantsLabExplanation,
  wantsLabSolution,
  question: q
});

if (wantsLabGuidance) {

  return res.json({
    source: "lab-guidance",
    reply: `
### Lab Assignment Guidance

This assignment requires you to perform the lab activity by launching the lab environment and completing the tasks described in the instructions.

Steps:

• Read the instructions on the current page.
• Click the Launch button to open the lab.
• Complete the hands-on exercises inside the lab environment.
• Record your observations and findings.
• Submit the required deliverables.

I cannot complete the graded lab for you, but I can explain concepts, commands, tools, and troubleshooting steps if you need help.
`
  });

}

/* ===================================== */
/* LAB SOLUTION PROTECTION */
/* ===================================== */

if (wantsLabSolution) {

  return res.json({
    answer: `
### Lab Assistance

I can help explain the concepts used in this lab and clarify the instructions, but I cannot provide step-by-step solutions, task answers, or complete graded lab activities.

Please review the lab instructions and attempt the activity independently.

If there is a specific concept, command, tool, or instruction that you do not understand, tell me which part is unclear and I can explain it.

If you continue to experience difficulty after reviewing the lab instructions, please contact your instructor.
`
  });

}

 /* ========================= */
/* MODULE LAB CHECK */
/* ========================= */

if (
  wantsLabs &&
  !wantsCourseWideSearch &&
  !wantsLabExplanation &&
  !wantsLabSolution &&
  currentPage
) {

  console.log("PAGE LINKS:", currentPage.links);

  let labs = [];

  if (currentPage.links?.length) {

    labs = currentPage.links
      .map(link => (link.text || "").trim())
      .filter(Boolean)
      .filter(text => {

        return (
          /\bilabs?\b/i.test(text) ||
          /\blab\s*\d*/i.test(text) ||
          /\blab assignment\b/i.test(text)
        );

      });

  }

  labs = [...new Set(labs)];

  console.log("LABS FOUND:", labs);

  /* LABS FOUND */

  if (labs.length) {

    return res.json({
      source: "page",
      reply:
`The following lab activities are available in this module:

${labs.map(x => `• ${x}`).join("\n")}

These lab activities can be accessed from the Learning Materials section of the module.`
    });

  }

  /* NO LABS FOUND ON CURRENT PAGE */

  return res.json({
    source: "page",
    reply:
`No lab activities are listed on the current page.

Lab activities are organized within individual course modules. Please open a specific module to view its associated Lab Assignments and hands-on activities.`
  });

}




/* ========================= */
/* INTERACTIVITY CHECK */
/* ========================= */

if (
  wantsInteractivityExplanation &&
  isInteractivityPage
) {

  return res.json({
    source: "page",
    reply:
`This page contains an interactive learning activity.

To understand the interactivity, please click the Begin button and follow the instructions, scenarios, and options provided within the activity.

If you need assistance after completing the interactivity, feel free to ask questions about the concepts covered in the activity.`
  });

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

    let lirnResources = [];

const wantsLearningResources =
  /(what is|explain|define|concept|topic|overview|understand)/i
  .test(message);

if (
  wantsLearningResources &&
  !wantsLabExplanation
) {
  lirnResources =
    getLibraryResources(message);
}

    

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

let effectiveMessage = message;

if (isFollowUp) {
  effectiveMessage = `
Previous Question:
${previousQuestion || ""}

Current Question:
${message}
`;
}

console.log("Effective Search Query:", effectiveMessage);

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
    effectiveMessage,
    [Number(courseId)],
    intent,
    currentPage,
    wantsLabs,
    wantsCourseWideSearch
  );

}

    

    /* ===================================== */
    /* WEB SEARCH */
    /* ===================================== */
let webSearchQuery = message;

if (isFollowUp) {

  const lastUserQuestion = history
    ?.filter(h => h.role === "user")
    ?.slice(-2, -1)?.[0]?.content;

  if (lastUserQuestion) {
    webSearchQuery = `${lastUserQuestion} ${message}`;
  }

}

console.log("Web Search Query:", webSearchQuery);



    let webResources = [];

let skipWebSearch = false;

/* ========================= */
/* WEB SEARCH TRIGGERS */
/* ========================= */

const needsWebExamples =
  /\b(example|examples|real world example|real-world example|case study|case studies)\b/i
  .test(message);

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

console.log("needsWebExamples:", needsWebExamples);

const shouldSearch =

  needsWebExamples &&

  !skipWebSearch &&

  !isGreeting(message) &&

  isCourseRelated;

if (shouldSearch) {

  try {

    webResources =
      await trustedWebSearch(webSearchQuery);

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
      !wantsLabExplanation &&
      !wantsLabSolution &&
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