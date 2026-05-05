function detectIntent(question) {

  const q = question.toLowerCase();

  /* -------------------------------------------------- */
  /* 🚫 RESTRICTED / CHEATING DETECTION (HIGHEST PRIORITY) */
  /* -------------------------------------------------- */

  const restrictedKeywords = [
    "exam answer",
    "quiz answer",
    "test answer",
    "midterm",
    "final exam",
    "give me answers",
    "answers for exam",
    "correct answers",
    "cheat",
    "cheating",
    "answer key",
    "solve exam",
    "solve test",
    "mcq answers"
  ];

  if (restrictedKeywords.some(k => q.includes(k))) {
    return "restricted";
  }

  /* -------------------------------------------------- */
  /* 📘 COURSE INTENTS */
  /* -------------------------------------------------- */

  if (q.includes("module")) {
    return "module";
  }

  if (q.includes("assignment")) {
    return "assignment";
  }

  if (
    q.includes("file") ||
    q.includes("document") ||
    q.includes("pdf") ||
    q.includes("lab")
  ) {
    return "file";
  }

  if (q.includes("discussion")) {
    return "discussion";
  }

  /* -------------------------------------------------- */
  /* 🔹 DEFAULT */
  /* -------------------------------------------------- */

  return "general";
}

module.exports = { detectIntent };