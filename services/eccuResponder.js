const fs = require("fs");
const path = require("path");

const STORE_PATH = path.join(__dirname, "../data/knowledge-store.json");

function searchKnowledge(question) {
  if (!fs.existsSync(STORE_PATH)) return null;

  const store = JSON.parse(fs.readFileSync(STORE_PATH));
  const lowerQ = question.toLowerCase();

  for (const course of store.courses) {
    for (const module of course.modules) {
      for (const item of module.items) {
        for (const keyword of item.keywords) {
          if (lowerQ.includes(keyword)) {
            return item.answer;
          }
        }
      }
    }
  }

  return null;
}

module.exports = { searchKnowledge };
