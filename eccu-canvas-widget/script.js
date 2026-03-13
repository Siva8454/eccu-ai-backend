/* =====================================================
   ECCU AI Tutor Chatbot
   Canvas Safe Version
===================================================== */

(function(){

/* Prevent duplicate loading */

if(window.eccuChatLoaded) return;
window.eccuChatLoaded = true;

/* --------------------------------------------------
   CANVAS CONTEXT
-------------------------------------------------- */

function getCanvasContext(){

const context = {
courseName:null,
moduleName:null,
dueDate:null,
submissionStatus:null
}

context.courseName =
document.title?.replace(" - Canvas","").trim() ||
document.querySelector("h1")?.innerText.trim() ||
null

return context
}

/* --------------------------------------------------
   COURSE ID
-------------------------------------------------- */

function getCourseId(){

const match = window.location.pathname.match(/courses\/(\d+)/)

return match ? Number(match[1]) : null

}

/* --------------------------------------------------
   INITIALIZE CHATBOT
-------------------------------------------------- */

function initChatbot(){

if(document.getElementById("eccu-chatbot")) return;

const CANVAS_CONTEXT = getCanvasContext()

let conversationHistory = []

/* ---------- CREATE CHAT UI ---------- */

const root = document.createElement("div")
root.id="eccu-chatbot"

root.innerHTML = `
<div id="eccu-avatar">💬</div>

<div id="eccu-chat">

<div id="eccu-chat-header">
ECCU AI Tutor
<button id="eccu-close">✕</button>
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

const avatar=root.querySelector("#eccu-avatar")
const chat=root.querySelector("#eccu-chat")
const closeBtn=root.querySelector("#eccu-close")
const sendBtn=root.querySelector("#eccu-send")
const input=root.querySelector("#eccu-input")
const chatBody=root.querySelector("#eccu-chat-body")

/* ---------- MESSAGE BUBBLES ---------- */

function addMessage(text,cls){

const div=document.createElement("div")
div.className=cls
div.innerText=text

chatBody.appendChild(div)

chatBody.scrollTop=chatBody.scrollHeight

return div
}

/* ---------- FAQ ---------- */

function showFAQs(){

const container=document.createElement("div")
container.className="eccu-faq"

const questions=[
"I cannot access my lab",
"How do I submit my assignment?",
"My eBook link is not opening"
]

questions.forEach(q=>{

const btn=document.createElement("button")

btn.innerText=q

btn.onclick=()=>{
addMessage(q,"user-msg")
processMessage(q)
}

container.appendChild(btn)

})

chatBody.appendChild(container)

}

/* ---------- OPEN CHAT ---------- */

avatar.onclick=()=>{

chat.style.display="flex"

if(!chatBody.hasChildNodes()){

addMessage(`Hi 👋 You're in ${CANVAS_CONTEXT.courseName || "ECCU Course"}.`,"bot-msg")

addMessage("How can I help you today?","bot-msg")

addMessage("Here are some common questions students ask:","bot-msg")

showFAQs()

}

}

/* ---------- CLOSE CHAT ---------- */

closeBtn.onclick=()=>{
chat.style.display="none"
}

/* ---------- SEND MESSAGE ---------- */

sendBtn.onclick=sendMessage

input.addEventListener("keydown",e=>{
if(e.key==="Enter") sendMessage()
})

function sendMessage(){

const msg=input.value.trim()

if(!msg) return

addMessage(msg,"user-msg")

conversationHistory.push({
role:"user",
content:msg
})

input.value=""

processMessage(msg)

}

/* --------------------------------------------------
   MESSAGE LOGIC
-------------------------------------------------- */

async function processMessage(msg){

const text=msg.toLowerCase()

/* ---------- SUPPORT FAQ ---------- */

const supportKeywords=[
"lab",
"assignment",
"submit",
"submission",
"ebook",
"jbl",
"popup",
"pop up",
"login",
"access",
"not opening"
]

const isSupportQuery=supportKeywords.some(k=>text.includes(k))

if(isSupportQuery){

if(text.includes("ebook") || text.includes("popup")){

addMessage(
"The eBook link may not open because your browser is blocking pop-ups. Click the pop-up blocked icon in the top-right of your browser and allow pop-ups for eccouncil.instructure.com.",
"bot-msg"
)

return
}

if(text.includes("lab")){

addMessage(
"If you cannot access your lab try:\n\n1. Refresh Canvas\n2. Allow pop-ups\n3. Use Chrome\n4. Disable extensions\n\nIf the issue continues contact ECCU support.",
"bot-msg"
)

return
}

}

/* ---------- GREETING ---------- */

if(text==="hi"||text==="hello"||text==="hey"){

addMessage("Hello 👋 I'm your ECCU AI Tutor. How can I help you today?","bot-msg")

return
}

/* ---------- LOADING ANIMATION ---------- */

const loading=document.createElement("div")
loading.className="bot-msg typing"
loading.innerHTML="<span></span><span></span><span></span>"

chatBody.appendChild(loading)

chatBody.scrollTop=chatBody.scrollHeight

try{

const res=await fetch("https://eccu-ai-backend.onrender.com/chat",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

message:msg,

history:conversationHistory.slice(-6),

courseId:getCourseId()

})

})

const data=await res.json()

loading.remove()

addMessage(data.reply || "I'm still learning this topic. Please contact ECCU support if you need immediate assistance.","bot-msg")

conversationHistory.push({
role:"assistant",
content:data.reply
})

}catch(e){

loading.remove()

addMessage("⚠ Unable to reach AI Tutor service.","bot-msg")

}

}

}

/* --------------------------------------------------
   INITIAL LOAD
-------------------------------------------------- */

initChatbot()

/* --------------------------------------------------
   CANVAS PAGE CHANGE DETECTOR
-------------------------------------------------- */

const observer=new MutationObserver(()=>{

initChatbot()

})

observer.observe(document.body,{
childList:true,
subtree:true
})

})();