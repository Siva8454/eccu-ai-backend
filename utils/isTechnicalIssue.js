function isTechnicalIssue(question = "") {

  const q = question.toLowerCase();

  const labTerms = [
    "lab",
    "skillable",
    "vm",
    "virtual machine",
    "launcher"
  ];

  const issueTerms = [
    "open",
    "opening",
    "working",
    "loading",
    "launch",
    "access",
    "stuck",
    "timeout",
    "expired",
    "error",
    "issue",
    "problem",
    "failed",
    "crash"
  ];

  return (
    labTerms.some(term => q.includes(term)) &&
    issueTerms.some(term => q.includes(term))
  );

}

module.exports = isTechnicalIssue;