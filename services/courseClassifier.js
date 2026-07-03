const axios = require("axios");

async function classifyCourseRelevance(
  courseName,
  question,
  previousQuestion = ""
) {
  console.log("Skipping LLM course classifier.");
  return true;
}

module.exports = {
  classifyCourseRelevance
};