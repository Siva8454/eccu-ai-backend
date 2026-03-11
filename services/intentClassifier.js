function classifyIntent(message) {
  const text = message.toLowerCase();

  const eccuKeywords = [
    "assignment",
    "module",
    "canvas",
    "eccu",
    "exam",
    "quiz",
    "lab",
    "labs"
  ];

  return eccuKeywords.some(k => text.includes(k))
    ? "ECCU"
    : "GENERAL";
}

module.exports = { classifyIntent };
