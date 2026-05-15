function detectIntent(question) {

  const q = question.toLowerCase();

  /* -------------------------------------------------- */
  /* 🚫 RESTRICTED */
  /* -------------------------------------------------- */

  const restrictedKeywords = [
    "exam answer",
    "quiz answer",
    "test answer",
    "midterm",
    "final exam",
    "give me answers",
    "correct answers",
    "cheat",
    "answer key",
    "solve exam",
    "mcq answers"
  ];

  if (restrictedKeywords.some(k => q.includes(k))) {
    return "restricted";
  }

  /* -------------------------------------------------- */
  /* 🛠️ TECHNICAL SUPPORT */
  /* -------------------------------------------------- */

  const supportKeywords = [
    "cannot login",
    "can't login",
    "login issue",
    "access issue",
    "not loading",
    "page not loading",
    "canvas issue",
    "ebook issue",
    "lab not working",
    "unable to access",
    "technical issue",
    "system error",
    "website issue",
    "popup blocked",
    "download problem"
  ];

  if (supportKeywords.some(k => q.includes(k))) {
    return "support";
  }

  /* -------------------------------------------------- */
  /* 🧪 EXERCISE GENERATION */
  /* -------------------------------------------------- */

  if (
    q.includes("exercise") ||
    q.includes("hands-on") ||
    q.includes("practice questions")
  ) {
    return "exercise_generation";
  }

  /* -------------------------------------------------- */
  /* 📘 EVERYTHING EDUCATIONAL */
  /* -------------------------------------------------- */

  return "general";
}

module.exports = { detectIntent };