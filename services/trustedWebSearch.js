const axios = require("axios");

async function trustedWebSearch(query) {

  try {

    const response = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: process.env.TAVILY_API_KEY,

        query: `
${query}

Find cybersecurity educational resources.

PRIORITY:
1. eccu.edu
2. owasp.org
3. nist.gov
4. cisa.gov

Return direct topic-specific pages only.
Avoid homepage links.
`,

        search_depth: "advanced",

        include_answer: false,

        max_results: 5,

        include_domains: [
  "eccu.edu",
  "owasp.org",
  "nist.gov",
  "cisa.gov",
  "portswigger.net",
  "sans.org",
  "tryhackme.com"
]
      }
    );

    const results = response.data.results || [];

    if (!results.length) {
      return "No trusted resources found.";
    }

    const filtered = results.filter(r => {

  const title = (r.title || "").toLowerCase();
  const url = (r.url || "").toLowerCase();

  return (
    r.url &&
    r.title &&

    !url.includes("404") &&
    !url.includes("error") &&
    !url.includes("/search") &&
    !url.includes("/tag/") &&
    !url.includes("/category/") &&

    !title.includes("page not found") &&
    !title.includes("not found") &&
    !title.includes("access denied") &&
    !title.includes("homepage") &&
    !title.includes("home page")
  );
});

    return filtered.map(r => ({
  title: r.title,
  url: r.url
}));

  } catch (err) {

    console.error(
      "Tavily search error:",
      err.response?.data || err.message
    );

    return "No trusted resources found.";
  }
}

module.exports = {
  trustedWebSearch
};