/* =====================================================
   ECCU AI Tutor Chatbot (Clean Version)
===================================================== */

(function(){

if(window.eccuChatLoaded) return;
window.eccuChatLoaded = true;

/* -------------------------------------------------- */
/* CANVAS CONTEXT */
/* -------------------------------------------------- */

function getCanvasContext() {

  const courseName =
    document.querySelector(".ellipsible")?.innerText ||
    document.title?.replace(" - Canvas", "").trim() ||
    null;

  const breadcrumbItems = document.querySelectorAll(".ic-app-crumbs a");

  let pageTitle = null;

  if (breadcrumbItems.length) {
    pageTitle = breadcrumbItems[breadcrumbItems.length - 1].innerText.trim();

    const badTitles = ["home page", "pages", "home"];

    if (badTitles.includes(pageTitle.toLowerCase())) {
      pageTitle = null;
    }
  }

  const isHomePage =
    window.location.pathname.endsWith("/pages/home") ||
    window.location.pathname.endsWith("/home");

  return {
    courseName,
    pageTitle,
    isHomePage
  };
}

/* -------------------------------------------------- */
/* COURSE ID */
/* -------------------------------------------------- */

function getCourseId(){

const match = window.location.pathname.match(/courses\/(\d+)/)
return match ? Number(match[1]) : null

}

/* -------------------------------------------------- */
/* COURSE FILTER */
/* -------------------------------------------------- */
function isAllowedCourse() {

  const courseId = getCourseId()

  const allowedCourses = [2213, 2460]

  return allowedCourses.includes(courseId)
}


/* -------------------------------------------------- */
/* INIT */
/* -------------------------------------------------- */

function initChatbot(){

if(document.getElementById("eccu-chatbot")) return;

if (!isAllowedCourse()) {
  console.log("🚫 ECCU AI Tutor disabled for this course:", getCourseId())
  return;
}

const CANVAS_CONTEXT = getCanvasContext()
let conversationHistory = []
let currentRequest = null;

/* ---------- FORMAT LINKS ---------- */

function formatLinks(text) {

  // remove angle brackets around URLs
  text = text.replace(
    /<(https?:\/\/[^>]+)>/g,
    '$1'
  );

  // convert URLs into clickable links
  text = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  );

  // preserve line breaks
  text = text.replace(/\n/g, "<br>");

  return text;
}

/* ---------- SCROLL MESSAGE TOP ---------- */

function scrollToBottom() {

  requestAnimationFrame(() => {

    chatBody.scrollTop =
      chatBody.scrollHeight;

  });

}

/* ---------- UI ---------- */

const root = document.createElement("div")
root.id="eccu-chatbot"

root.innerHTML = `
<div id="eccu-avatar">🤖</div>

<div id="eccu-chat">

  <div id="eccu-chat-header">
    <div class="eccu-header-left">

    <div class="eccu-title-row">

  <span class="eccu-title">
    ECCU AI Tutor
  </span>

  <span class="eccu-beta">
    BETA
  </span>

</div>

  </div>

    <div class="eccu-actions">
      <button id="eccu-max">⛶</button>
      <button id="eccu-close">×</button>
    </div>
  </div>

  <div id="eccu-chat-body"></div>

  <div id="eccu-chat-footer">
    <input id="eccu-input" placeholder="Ask ECCU AI Tutor..." />
    <button id="eccu-send">➤</button>
  </div>

</div>
`

document.body.appendChild(root)

/* ---------- ELEMENTS ---------- */

const avatar = root.querySelector("#eccu-avatar")
const chat = root.querySelector("#eccu-chat")
const closeBtn = root.querySelector("#eccu-close")
const sendBtn = root.querySelector("#eccu-send")
const input = root.querySelector("#eccu-input")
const chatBody = root.querySelector("#eccu-chat-body")
const maxBtn = root.querySelector("#eccu-max")

/* ---------- MESSAGE ---------- */

function addMessage(text, cls){

  const div = document.createElement("div")
  div.className = cls

  div.innerHTML = formatLinks(text)   // ✅ IMPORTANT

  chatBody.appendChild(div)

  if (cls === "user-msg") {
    // ✅ show user message immediately
    scrollToBottom()
  }

   if (cls === "bot-msg") {
  scrollToBottom()
}

  return div
}

/* ---------- FAQ ---------- */

function showFAQs(){

  if (
  chatBody.querySelector(".eccu-faq")
) return;

const container = document.createElement("div")
container.className = "eccu-faq"


const options = [
  {
    label: "Course / Topic",
    reply: "Please enter your query related to this topic."
  },
  {
    label: "Labs",
    reply: "Type your question or concern here."
  },
  {
    label: "Assignments / Research Project / Case Study",
    reply: "Tell us what you need help with."
  },
  {
    label: "Help & Support",
    reply: "Enter your query for personalized support."
  },
  {
    label: "Other",
    reply: "Describe your question in a few words."
  }
]

options.forEach(opt => {

  const btn = document.createElement("button")
  const icons = {
  "Course / Topic": "📖",
  "Labs": "🧪",
  "Assignments / Research Project / Case Study": "📄",
  "Help & Support": "❓",
  "Other": "⚙️"
};

btn.innerHTML = `
<span>${icons[opt.label]}</span>
<span>${opt.label}</span>
`;

  btn.onclick = () => {
    addMessage(opt.label, "user-msg")
    processMessage(opt.label)
  }

  container.appendChild(btn)

})

chatBody.appendChild(container)

}

/* ---------- OPEN ---------- */

const context = getCanvasContext();

console.log("ENV:", window.ENV);
console.log("courseName:", context.courseName);
console.log("pageTitle:", context.pageTitle);

avatar.onclick = () => {

  chat.classList.add("open");

  setTimeout(() => {
    input.focus();
  }, 120);

  scrollToBottom();

if(!chatBody.hasChildNodes()){

let displayText = "this page";

if (context.pageTitle?.toLowerCase().includes("syllabus")) {
  displayText = "the Syllabus page 📘";
}
else if (context.pageTitle?.toLowerCase().includes("discussion")) {
  displayText = `${context.pageTitle || "Discussion"} 💬`;
}

else if (context.pageTitle?.toLowerCase().includes("assignment")) {
  displayText = `${context.pageTitle || "Assignment"} 📝`;
}

else if (context.pageTitle?.toLowerCase().includes("quiz")) {
  displayText = `${context.pageTitle || "Quiz"} 🧠`;
}
else {
  displayText =
    context.pageTitle ||
    context.courseName ||
    "this page";
}

  addMessage(`Hi 👋 You're on ${displayText}`, "welcome-msg");

addMessage("What do you need help with today?", "welcome-msg");

showFAQs()


}

}

/* ---------- CLOSE ---------- */

closeBtn.onclick = () => {

  chat.classList.remove("open");

  chat.classList.remove("fullscreen");

  maxBtn.innerText = "⛶";
}

/* ---------- MAXIMIZE ---------- */

maxBtn.onclick = () => {

  chat.style.transformOrigin = "center center";

  const isFullscreen =
    chat.classList.toggle("fullscreen");

if (isFullscreen) {

    document.body.style.overflow = "hidden";

} else {

    document.body.style.overflow = "";

}

  maxBtn.innerText =
    isFullscreen ? "❐" : "⛶";

  scrollToBottom();
}

/* ---------- ESC CLOSE ---------- */

document.addEventListener("keydown", e => {

  if (
    e.key === "Escape" &&
    chat.classList.contains("open")
  ) {

    closeBtn.click();
  }
});

/* ---------- SEND ---------- */

sendBtn.onclick = sendMessage

input.addEventListener("keydown", e => {
if(e.key === "Enter") sendMessage()
})

function sendMessage(){

const msg = input.value.trim()
if(!msg) return

addMessage(msg, "user-msg")

conversationHistory.push({
role:"user",
content:msg
})

input.value = ""

processMessage(msg)

}

/* -------------------------------------------------- */
/* MESSAGE LOGIC */
/* -------------------------------------------------- */

async function processMessage(msg){

const text = msg.toLowerCase()

/* ---------- AI KEY TRANSFER HELP ---------- */

if (
  text.includes("ai key") ||
  text.includes("activation key") ||
  text.includes("transfer key") ||
  text.includes("parrot") ||
  text.includes("ai activation")
) {

 const courseId = getCourseId()

const moduleLink = courseId
  ? `https://eccouncil.instructure.com/courses/${courseId}/modules`
  : ""

addMessage(
`You can find the instructions on how to transfer the AI Key from the Host Machine to the Parrot Security VM in:

📘 Module 01 – Lab Setup

Under the section:
“Instructions to Download your AI Activation Key for ECCU LMS.”

${moduleLink ? `\nGo to Modules: ${moduleLink}` : ""}`,
"bot-msg"
)

  return;
}

/* SUPPORT QUICK RESPONSES */

if (
   text.includes("ebook not opening") ||
   text.includes("cannot open ebook") ||
   text.includes("popup blocked")
){

addMessage("Please enable pop-ups in your browser for ECCU.", "bot-msg")
return
}


/* LOADING */

const loading = document.createElement("div")
loading.className = "bot-msg typing-bubble"
loading.innerHTML = `
<div class="typing">
  <span></span>
  <span></span>
  <span></span>
</div>
`

chatBody.appendChild(loading)
scrollToBottom()

/* API CALL */

try{

const currentUserId =
  window.ENV?.current_user_id
    ? `${getCourseId()}-${window.ENV.current_user_id}`
    : `${getCourseId()}-student`;

const mainContent =
  document.querySelector("#content") ||
  document.querySelector(".discussion-topic") ||
  document.querySelector(".assignment") ||
  document.querySelector(".quiz") ||
  document.body;

const pageText =
  mainContent.innerText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25000);

let pageType = "general";

if (
  window.location.pathname.includes("/assignments/")
) {
  pageType = "assignment";
}

else if (
  window.location.pathname.includes("/discussion_topics/")
) {
  pageType = "discussion";
}

else if (
  window.location.pathname.includes("/quizzes/")
) {
  pageType = "quiz";
}

else if (
  window.location.pathname.includes("/modules")
) {
  pageType = "module";
}

const currentPage = {
  url: window.location.href,
  title: document.title,
  text: pageText,
  type: pageType
};

console.log("📤 Sending Request:", {

  message: msg,

  currentPage,

  courseId: getCourseId(),

  userId: currentUserId,

  history:
    conversationHistory.slice(-12)

});

  /* -------------------------- */
/* ABORT PREVIOUS REQUEST */
/* -------------------------- */

if (currentRequest) {
  currentRequest.abort();
}

currentRequest =
  new AbortController();

const res = await fetch("https://aitutor.eccu.edu/chat", {

method:"POST",
headers:{ "Content-Type":"application/json" },
signal: currentRequest.signal,

body: JSON.stringify({
  message: msg,
  history: conversationHistory.slice(-12),
  courseId: getCourseId(),
  currentPage: {
  url: window.location.href,
  pageTitle: document.title,
  title: document.title,
  text: pageText,
  type: pageType
},
  pageText,
  userId: currentUserId
})

})

const data = await res.json()
currentRequest = null;

console.log(
  "🤖 AI Response:",
  data
);

loading.remove()

const botReply = addMessage(
  data.reply || "Please contact your instructor or ECCU support.",
  "bot-msg"
)

scrollToBottom()

conversationHistory.push({
role:"assistant",
content:data.reply
})

}catch(e){

loading.remove()

addMessage(
  "⚠ AI service not reachable.",
  "bot-msg"
)

scrollToBottom()

}

}

}

/* INIT */

initChatbot()

/* OBSERVER */

const observer = new MutationObserver(() => {
initChatbot()
})

observer.observe(document.body,{
childList:true,
subtree:true
})

})();