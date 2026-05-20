const axios = require("axios");

const {
  search
} = require("duck-duck-scrape");

async function trustedWebSearch(query) {

  try {

    /* ===================================== */
    /* DUCKDUCKGO SEARCH */
    /* ===================================== */

    const ddgResults = await search(query, {

      safeSearch: false

    });

    const trustedDomains = [

      "eccu.edu",
      "owasp.org",
      "nist.gov",
      "cisa.gov",
      "portswigger.net",
      "sans.org",
      "tryhackme.com"

    ];

    const filtered = (ddgResults.results || [])

      .filter(r => {

        const url =
          (r.url || "").toLowerCase();

        const title =
          (r.title || "").toLowerCase();

        return (

          trustedDomains.some(domain =>
            url.includes(domain)
          ) &&

          !url.includes("404") &&
          !url.includes("/search") &&
          !url.includes("/tag/") &&
          !url.includes("/category/") &&

          !title.includes("not found") &&
          !title.includes("access denied")

        );

      })

      .slice(0, 5)

      .map(r => ({

        title: r.title,
        url: r.url

      }));


    /* ===================================== */
    /* RETURN DDG RESULTS */
    /* ===================================== */

    if (filtered.length > 0) {

      return filtered;
    }


    /* ===================================== */
    /* TAVILY FALLBACK */
    /* ===================================== */

    console.log(
      "DDG failed. Using Tavily fallback..."
    );

    const response = await axios.post(

      "https://api.tavily.com/search",

      {

        api_key:
          process.env.TAVILY_API_KEY,

        query: `
${query}

Find cybersecurity educational resources.

Return direct topic-specific pages only.
Avoid homepage links.
`,

        search_depth: "advanced",

        include_answer: false,

        max_results: 5,

        include_domains: trustedDomains

      }

    );

    const tavilyResults =
      response.data.results || [];

    return tavilyResults.map(r => ({

      title: r.title,
      url: r.url

    }));

  }

  catch (err) {

    console.error(
      "trustedWebSearch error:",
      err.message
    );

    return [];
  }
}

module.exports = {
  trustedWebSearch
};