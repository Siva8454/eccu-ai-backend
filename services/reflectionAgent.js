function shouldRetry(question, docs) {

  if (!docs || docs.length === 0) {
    return true;
  }

  const combined =
    docs
      .map(d => d.pageContent || "")
      .join(" ")
      .toLowerCase();

  const q =
    question.toLowerCase();

  const keywords =
    q.split(/\s+/)
      .filter(w => w.length > 3);

  let matches = 0;

  keywords.forEach(word => {

    if (combined.includes(word)) {
      matches++;
    }

  });

  const relevance =
    matches / keywords.length;

  // LOW RELEVANCE
  if (relevance < 0.25) {
    return true;
  }

  // TOO SHORT
  if (combined.length < 300) {
    return true;
  }

  return false;
}

module.exports = {
  shouldRetry
};