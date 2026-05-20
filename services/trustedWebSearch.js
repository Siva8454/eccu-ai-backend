const axios = require("axios");

const {
  search
} = require("duck-duck-scrape");


/* ===================================== */
/* VALID RESOURCE FILTER */
/* ===================================== */

function isValidResource(url, title = "") {

  url = (url || "").toLowerCase();
  title = (title || "").toLowerCase();

  return (

    /* BLOCK BAD PAGES */
    !url.includes("404") &&
    !url.includes("/search") &&
    !url.includes("/tag/") &&
    !url.includes("/category/") &&
    !url.includes("/author/") &&
    !url.includes("/contributors/") &&

    /* BLOCK WIKIPEDIA / COMPETITORS */
    !url.includes("wikipedia.org") &&
    !url.includes("comptia.org") &&
    !url.includes("udemy.com") &&
    !url.includes("coursera.org") &&
    !url.includes("edx.org") &&
    !url.includes("reddit.com") &&

    /* BLOCK GENERIC HOMEPAGES */
    !url.endsWith(".org/") &&
    !url.endsWith(".com/") &&
    !url.endsWith(".gov/") &&
    !url.endsWith(".edu/") &&

    /* BLOCK BAD TITLES */
    !title.includes("not found") &&
    !title.includes("access denied") &&
    !title.includes("page not found")

  );
}


/* ===================================== */
/* TRUSTED WEB SEARCH */
/* ===================================== */

async function trustedWebSearch(query) {

  try {

    const trustedDomains = [

      "eccu.edu",
      "eccouncil.org",
      "owasp.org",
      "nist.gov",
      "cisa.gov",
      "portswigger.net",
      "sans.org",
      "tryhackme.com",
      "cloudflare.com",
      "learn.microsoft.com",
      "aws.amazon.com"

    ];


    /* ===================================== */
    /* ENHANCED DDG QUERY */
    /* ===================================== */

    const enhancedQuery = `
${query}

cybersecurity
OWASP
NIST
CISA
official resources
`;


    /* ===================================== */
    /* DUCKDUCKGO SEARCH */
    /* ===================================== */

    const ddgResults = await search(
      enhancedQuery,
      {
        safeSearch: false
      }
    );


    let filtered = (ddgResults.results || [])

      .filter(r => {

        const url =
          (r.url || "").toLowerCase();

        const title =
          (r.title || "").toLowerCase();

        return (

          trustedDomains.some(domain =>
            url.includes(domain)
          ) &&

          isValidResource(url, title)

        );

      })

      /* REMOVE DUPLICATES */
      .filter((item, index, self) =>

        index === self.findIndex(t =>
          t.url === item.url
        )

      )

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

Find trusted cybersecurity educational resources.

STRICT RULES:
- Return direct topic-specific pages only
- Avoid homepage links
- Avoid Wikipedia
- Avoid competitor certifications
- Avoid broken URLs
- Prefer OWASP/NIST/CISA/ECCU resources
`,

        search_depth: "advanced",

        include_answer: false,

        max_results: 5,

        include_domains: trustedDomains

      }

    );


    const tavilyResults =
      response.data.results || [];


    filtered = tavilyResults

      .filter(r =>

        isValidResource(
          r.url,
          r.title
        )

      )

      .slice(0, 5)

      .map(r => ({

        title: r.title,
        url: r.url

      }));


    /* ===================================== */
    /* FALLBACK STATIC RESOURCES */
    /* ===================================== */

    if (filtered.length === 0) {

      filtered = [

        {
          title:
            "OWASP Top 10",

          url:
            "https://owasp.org/www-project-top-ten/"
        },

        {
          title:
            "NIST Cybersecurity Framework",

          url:
            "https://www.nist.gov/cyberframework"
        },

        {
          title:
            "CISA Cybersecurity Resources",

          url:
            "https://www.cisa.gov/cybersecurity"
        }

      ];

    }

    return filtered;

  }

  catch (err) {

    console.error(
      "trustedWebSearch error:",
      err.message
    );

    return [

      {
        title:
          "OWASP Top 10",

        url:
          "https://owasp.org/www-project-top-ten/"
      },

      {
        title:
          "NIST Cybersecurity Framework",

        url:
          "https://www.nist.gov/cyberframework"
      }

    ];

  }

}

module.exports = {
  trustedWebSearch
};