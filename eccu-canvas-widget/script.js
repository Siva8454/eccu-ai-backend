/* =====================================================
   ECCU AI Tutor Chatbot (Clean Version)
===================================================== */

(function(){

if(window.eccuChatLoaded) return;
window.eccuChatLoaded = true;

/* -------------------------------------------------- */
/* CANVAS CONTEXT */
/* -------------------------------------------------- */

function getCanvasContext(){

const context = {
courseName:null
}

context.courseName =
document.title?.replace(" - Canvas","").trim() ||
document.querySelector("h1")?.innerText.trim() ||
null

return context
}

/* -------------------------------------------------- */
/* COURSE ID */
/* -------------------------------------------------- */

function getCourseId(){

const match = window.location.pathname.match(/courses\/(\d+)/)
return match ? Number(match[1]) : null

}

/* -------------------------------------------------- */
/* INIT */
/* -------------------------------------------------- */

function initChatbot(){

if(document.getElementById("eccu-chatbot")) return;

const CANVAS_CONTEXT = getCanvasContext()
let conversationHistory = []

/* ---------- FORMAT LINKS ---------- */

function formatLinks(text) {
  // Convert URLs to clickable links
  let formatted = text.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank">$1</a>'
  )

  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, "<br>")

  return formatted
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

avatar.onclick = () => {

chat.style.display = "flex"

if(!chatBody.hasChildNodes()){

addMessage(`Hi 👋 You're in ${CANVAS_CONTEXT.courseName || "ECCU Course"}.`, "bot-msg")

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

  addMessage(
`You can find the instructions here:<br><br>

<a href="https://eccouncil.instructure.com/courses/2201/pages/module-01-content" target="_blank">
Open Module 01 – CEH Lab Setup
</a><br><br>

Follow the section:
<strong>“Instructions to Download your AI Activation Key for ECCU LMS.”</strong>
`,
"bot-msg"
);

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

const res = await fetch("https://eccu-ai-backend.onrender.com/chat", {

method:"POST",
headers:{ "Content-Type":"application/json" },

body: JSON.stringify({
  message: msg,
  history: conversationHistory.slice(-6),
  courseId: getCourseId(),
  currentPage: window.location.pathname
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