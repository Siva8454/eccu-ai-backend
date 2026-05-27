function expandQuery(question = "") {

  const q =
    question.toLowerCase();

  const queries = [question];

  /* -------------------------- */
  /* SECURITY TERMS */
  /* -------------------------- */

  if (q.includes("phishing")) {

    queries.push(
      "email spoofing",
      "social engineering",
      "credential theft"
    );
  }

  if (q.includes("sql injection")) {

    queries.push(
      "database attack",
      "sql exploit",
      "injection vulnerability"
    );
  }

  if (q.includes("penetration testing")) {

    queries.push(
      "ethical hacking",
      "security assessment",
      "vulnerability testing"
    );
  }

  if (q.includes("malware")) {

    queries.push(
      "virus",
      "trojan",
      "ransomware"
    );
  }

  return [
    ...new Set(queries)
  ];
}

module.exports = {
  expandQuery
};