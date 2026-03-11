function detectIntent(question) {

  const q = question.toLowerCase();

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

  return "general";
}

module.exports = { detectIntent };