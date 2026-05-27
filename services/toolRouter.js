function selectTool(question) {

  const q =
    question.toLowerCase();

  /* ----------------------------- */
  /* CURRENT PAGE */
  /* ----------------------------- */

  if (
    q.includes("this page") ||
    q.includes("this assignment") ||
    q.includes("this discussion") ||
    q.includes("what module")
  ) {
    return "current_page";
  }

  /* ----------------------------- */
  /* FILE SEARCH */
  /* ----------------------------- */

  if (
    q.includes("pdf") ||
    q.includes("template") ||
    q.includes("document") ||
    q.includes("file")
  ) {
    return "file_search";
  }

  /* ----------------------------- */
  /* WEB SEARCH */
  /* ----------------------------- */

  if (
    q.includes("latest") ||
    q.includes("recent") ||
    q.includes("current attack") ||
    q.includes("today")
  ) {
    return "web_search";
  }

  /* ----------------------------- */
  /* LIRN */
  /* ----------------------------- */

  if (
    q.includes("research paper") ||
    q.includes("journal") ||
    q.includes("peer reviewed") ||
    q.includes("academic source")
  ) {
    return "lirn_search";
  }

  /* ----------------------------- */
  /* DEFAULT */
  /* ----------------------------- */

  return "vector_search";
}

module.exports = {
  selectTool
};