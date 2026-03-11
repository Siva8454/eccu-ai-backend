const fs = require("fs")
const path = require("path")

const LEARN_FILE = path.join(__dirname,"../data/learned-knowledge.json")

function saveQA(question, answer){

let store = { qa: [] }

if(fs.existsSync(LEARN_FILE)){
store = JSON.parse(fs.readFileSync(LEARN_FILE))
}

store.qa.push({
question: question.toLowerCase(),
answer,
createdAt: new Date()
})

/* ---------- PREVENT DUPLICATE QUESTIONS ---------- */

if(store.qa.find(q => q.question === question.toLowerCase())){
  return;
}

store.qa.push({
question: question.toLowerCase(),
answer,
createdAt: new Date()
})

fs.writeFileSync(LEARN_FILE, JSON.stringify(store,null,2))

}


function searchLearned(question){

if(!fs.existsSync(LEARN_FILE)) return null

const store = JSON.parse(fs.readFileSync(LEARN_FILE))

const q = question.toLowerCase()

for(const item of store.qa){

if(q.includes(item.question) || item.question.includes(q)){
return item.answer
}

}

return null
}

module.exports = { saveQA, searchLearned }