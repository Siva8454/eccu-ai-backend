function rerank(question, results) {

  const q = question.toLowerCase();

  return results
    .map(r => {

      const text = (r.payload.content || "").toLowerCase();

      let score = r.score;

      if (text.includes(q)) score += 0.3;

      if (text.includes("module")) score += 0.1;

      return {
        ...r,
        score
      };

    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // return best 3 chunks
}

module.exports = { rerank };