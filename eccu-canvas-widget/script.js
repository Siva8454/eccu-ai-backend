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

  const allowedCourses = [2213, 2281]

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

/* ---------- FORMAT LINKS ---------- */

function formatLinks(text) {

  // remove angle brackets around URLs
  text = text.replace(
    /<(https?:\/\/[^>]+)>/g,
    '$1'
  );

  // convert URLs into clickable links
  return text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  );
}

  // Convert normal URLs
  text = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  )

  text = text.replace(/\n/g, "<br>")

  return text
}

/* ---------- SCROLL MESSAGE TOP ---------- */
function scrollToMessage(element) {
  setTimeout(() => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 50);
}
function scrollToBottom() {
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 50);
}

/* ---------- UI ---------- */

const root = document.createElement("div")
root.id="eccu-chatbot"

root.innerHTML = `
<div id="eccu-avatar">💬</div>

<div id="eccu-chat">

  <div id="eccu-chat-header">
    <span class="eccu-title">ECCU AI Tutor</span>

    <div class="eccu-actions">
      <button id="eccu-max">⛶</button>
      <button id="eccu-close">×</button>
    </div>
  </div>

  <div id="eccu-chat-body"></div>

  <div id="eccu-chat-footer">
    <input id="eccu-input" placeholder="Ask me anything..." />
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
    scrollToMessage(div)
  }

  return div
}

/* ---------- FAQ ---------- */

function showFAQs(){

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
  btn.innerText = opt.label

  btn.onclick = () => {
    addMessage(opt.label, "user-msg")
    addMessage(opt.reply, "bot-msg")
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

chat.style.display = "flex"

if(!chatBody.hasChildNodes()){

const displayText =
  context.isHomePage
    ? context.courseName
    : context.pageTitle || context.courseName || "this page";

  addMessage(`Hi 👋 You're in ${displayText}`, "bot-msg");

addMessage("What do you need help with today?", "bot-msg")

showFAQs()

}

}

/* ---------- CLOSE ---------- */

closeBtn.onclick = () => {
chat.style.display = "none"
}

/* ---------- MAXIMIZE ---------- */

maxBtn.onclick = () => {
chat.classList.toggle("fullscreen")
}

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

if(text.includes("ebook") || text.includes("popup")){

addMessage("Please enable pop-ups in your browser for ECCU.", "bot-msg")
return
}

if(text.includes("lab")){

addMessage("Try refreshing Canvas and enabling pop-ups. Contact support if issue persists.", "bot-msg")
return
}

/* LOADING */

const loading = document.createElement("div")
loading.className = "bot-msg"
loading.innerText = "Typing..."

chatBody.appendChild(loading)

/* API CALL */

try{

const currentUserId = getCourseId() + "-student"; 

const res = await fetch("https://eccu-ai-backend.onrender.com/chat", {

method:"POST",
headers:{ "Content-Type":"application/json" },

body: JSON.stringify({
  message: msg,
  history: conversationHistory.slice(-6),
  courseId: getCourseId(),
  currentPage: window.location.pathname,
  userId: currentUserId
})

})

const data = await res.json()

loading.remove()

addMessage(
  data.reply || "Please contact your instructor or ECCU support.",
  "bot-msg"
)

conversationHistory.push({
role:"assistant",
content:data.reply
})

}catch(e){

loading.remove()
addMessage("⚠ AI service not reachable.", "bot-msg")

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