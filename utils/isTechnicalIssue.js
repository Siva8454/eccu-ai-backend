function isTechnicalIssue(question = "") {

  const q = question.toLowerCase();

  const keywords = [
    "lab not working",
    "lab wont work",
    "lab won't work",
    "lab not loading",
    "lab wont load",
    "lab won't load",
    "skillable",
    "cannot access",
    "can't access",
    "cant access",
    "unable to access",
    "error",
    "issue",
    "problem",
    "not launching",
    "launch failed",
    "video not playing",
    "page not loading",
    "login problem"
  ];

  return keywords.some(keyword =>
    q.includes(keyword)
  );
}

module.exports = isTechnicalIssue;