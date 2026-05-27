function rerankDocuments(question, docs) {

  const q =
    question.toLowerCase();

  const keywords =
    q.split(/\s+/);

  const scored = docs.map(doc => {

    const text =
      (doc.pageContent || "")
        .toLowerCase();

    let score = 0;

    /* ----------------------------- */
    /* KEYWORD MATCHING */
    /* ----------------------------- */

    keywords.forEach(word => {

      if (
        word.length > 3 &&
        text.includes(word)
      ) {
        score += 2;
      }

    });

    /* ----------------------------- */
    /* TYPE PRIORITY */
    /* ----------------------------- */

    const type =
      doc.metadata?.type || "";

    if (type === "page") score += 5;

    if (type === "assignment") score += 4;

    if (type === "discussion") score += 3;

    if (type === "module") score += 2;

    if (type === "file") score += 1;

    /* ----------------------------- */
    /* CONTENT QUALITY */
    /* ----------------------------- */

    const length =
      text.length;

    if (length > 300)
      score += 2;

    if (length > 1000)
      score += 1;

    /* ----------------------------- */
    /* EDUCATIONAL BOOST */
    /* ----------------------------- */

    if (
      text.includes("learning") ||
      text.includes("objective") ||
      text.includes("security") ||
      text.includes("vulnerability") ||
      text.includes("attack")
    ) {
      score += 2;
    }

    /* ----------------------------- */
    /* PENALIZE GARBAGE */
    /* ----------------------------- */

    if (
      text.includes("copyright") ||
      text.includes("all rights reserved")
    ) {
      score -= 10;
    }

    return {
      ...doc,
      rerankScore: score
    };

  });

  scored.sort(
    (a, b) =>
      b.rerankScore - a.rerankScore
  );

  return scored.slice(0, 5);
}

module.exports = {
  rerankDocuments
};