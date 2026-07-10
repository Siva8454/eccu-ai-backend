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
    "crash",
    "lab not working",
  "lab is not working",
  "lab not opening",
  "lab is not opening",
  "lab wont work",
  "lab won't work",
  "lab wont open",
  "lab won't open",
  "cant open",
  "can't open",
  "cannot open",
  "unable to open",
  "lab not loading",
  "loading problem",
  "launch failed",
  "not launching",
  "vm not starting",
  "vm won't start",
  "vm failed",
  "cannot access",
  "can't access",
  "cant access",
  "unable to access",
  "skillable",
  "technical issue",
  "error",
  "problem"
  ];

  return (
    labTerms.some(term => q.includes(term)) &&
    issueTerms.some(term => q.includes(term))
  );

}

module.exports = isTechnicalIssue;