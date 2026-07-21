function analyzeQuery(question, userId) {

    const memory =
  getMemory(userId);

  const q = question.toLowerCase();

  let type = null;
  let moduleName = null;

    const {
    getMemory,
    saveMemory
    } = require("./memoryStore");

  /* ----------------------------- */
  /* TYPE DETECTION */
  /* ----------------------------- */

  if (
    q.includes("assignment") ||
    q.includes("submit") ||
    q.includes("due")
  ) {
    type = "assignment";
  }

  else if (
    q.includes("discussion") ||
    q.includes("discussion thread") ||
    q.includes("peer reply")
  ) {
    type = "discussion";
  }

  else if (
    q.includes("file") ||
    q.includes("pdf") ||
    q.includes("template") ||
    q.includes("document")
  ) {
    type = "file";
  }

  else if (
    q.includes("syllabus") ||
    q.includes("grading") ||
    q.includes("attendance")
  ) {
    type = "syllabus";
  }

  /* ----------------------------- */
  /* MODULE DETECTION */
  /* ----------------------------- */

  const moduleMatch =
    q.match(/module\s*(\d+)/i);

  if (moduleMatch) {

    const num =
      moduleMatch[1]
        .padStart(2, "0");

    moduleName =
      `Module ${num}`;
  }

  /* -------------------------------- */
/* MEMORY FALLBACK */
/* -------------------------------- */

if (
  !moduleName &&
  memory.moduleName
) {
  moduleName =
    memory.moduleName;
}

if (
  !type &&
  memory.type
) {
  type =
    memory.type;
}

/* -------------------------------- */
/* SAVE MEMORY */
/* -------------------------------- */

saveMemory(userId, {
  moduleName,
  type
});

  const wantsModuleSummary =
    /(summar(y|ize)|overview|teach|explain)/i.test(q) &&
    /module\s*\d+/i.test(q);

const wantsPageSearch =
    q.includes("module") ||
    q.includes("assignment") ||
    q.includes("discussion") ||
    q.includes("lab") ||
    q.includes("resource") ||
    q.includes("week");

return {
    type,
    moduleName,
    wantsModuleSummary,
    wantsPageSearch
};

module.exports = {
  analyzeQuery
};