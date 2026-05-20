const axios = require("axios");

const {
  search
} = require("duck-duck-scrape");


/* ===================================== */
/* BLOCKED DOMAINS */
/* ===================================== */

const blockedDomains = [

  /* Competitors */
  "comptia.org",
  "udemy.com",
  "coursera.org",
  "edx.org",

  /* Unsafe */
  ".onion",
  "darkweb",
  "deepweb",
  "tor.link",

  /* Low Quality */
  "wikipedia.org",
  "reddit.com",
  "quora.com"

];


/* ===================================== */
/* TRUST SCORE */
/* ===================================== */

function getTrustScore(url = "") {

  url = url.toLowerCase();

  if (url.includes(".gov")) return 10;

  if (url.includes("owasp")) return 9;
  if (url.includes("nist")) return 9;
  if (url.includes("cisa")) return 9;

  if (url.includes("microsoft")) return 8;
  if (url.includes("aws")) return 8;
  if (url.includes("google")) return 8;
  if (url.includes("cloudflare")) return 8;
  if (url.includes("cisco")) return 8;

  if (url.includes("sans")) return 8;
  if (url.includes("portswigger")) return 8;
  if (url.includes("rapid7")) return 8;
  if (url.includes("crowdstrike")) return 8;
  if (url.includes("paloaltonetworks")) return 8;

  return 5;
}


/* ===================================== */
/* TOPIC RELEVANCE */
/* ===================================== */

function isTopicRelevant(title, query, url = "") {

  const text =
    `${title} ${url}`.toLowerCase();

  const q =
    query.toLowerCase();

  const stopWords = [

    "what",
    "is",
    "the",
    "difference",
    "between",
    "and",
    "how",
    "does",
    "work",
    "explain",
    "about"

  ];

  const keywords = q
    .split(/\s+/)
    .filter(word =>
      word.length > 2 &&
      !stopWords.includes(word)
    );

  const matches =
    keywords.filter(keyword =>
      text.includes(keyword)
    );

  return matches.length >=
    Math.max(1, Math.ceil(keywords.length * 0.6));
}


/* ===================================== */
/* VALID RESOURCE FILTER */
/* ===================================== */

function isValidResource(url, title = "", query = "") {

  url = (url || "").toLowerCase();
  title = (title || "").toLowerCase();
  query = (query || "").toLowerCase();

  return (

    /* BLOCK BAD DOMAINS */
    !blockedDomains.some(domain =>
      url.includes(domain)
    ) &&

    /* BLOCK BAD PAGES */
    !url.includes("404") &&
    !url.includes("/search") &&
    !url.includes("/tag/") &&
    !url.includes("/category/") &&
    !url.includes("/author/") &&
    !url.includes("/contributors/") &&
    !url.includes("/login") &&
    !url.includes("/signup") &&
    !url.includes("javascript:void") &&

    /* BLOCK GENERIC HOMEPAGES */
    !url.endsWith(".org/") &&
    !url.endsWith(".com/") &&
    !url.endsWith(".gov/") &&
    !url.endsWith(".edu/") &&

    /* BLOCK GENERIC TOP 10 PAGE */
    !(
      title.includes("top 10") &&
      !query.includes("top 10")
    ) &&

    /* BLOCK BAD TITLES */
    !title.includes("not found") &&
    !title.includes("access denied") &&
    !title.includes("page not found") &&

    /* TOPIC MATCH */
    isTopicRelevant(title, query, url)

  );
}


/* ===================================== */
/* TRUSTED WEB SEARCH */
/* ===================================== */

async function trustedWebSearch(query) {

  try {

    /* ===================================== */
    /* ENHANCED DDG QUERY */
    /* ===================================== */

    const enhancedQuery = `
${query}

cybersecurity
official documentation
educational resources
tutorial
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

        return isValidResource(
          url,
          title,
          query
        );

      })

      /* REMOVE DUPLICATES */
      .filter((item, index, self) =>

        index === self.findIndex(t =>
          t.url === item.url
        )

      )

      /* SORT BY TRUST */
      .sort((a, b) =>

        getTrustScore(b.url) -
        getTrustScore(a.url)

      )

      .slice(0, 5)

      .map(r => ({

        title: r.title,

        url: (r.url || "")
          .split("](")[0]
          .replace(/\)+$/, "")
          .trim()

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
- Avoid competitors
- Avoid dark web
- Avoid broken URLs
`,

        search_depth: "advanced",

        include_answer: false,

        max_results: 10

      }

    );


    const tavilyResults =
      response.data.results || [];


    filtered = tavilyResults

      .filter(r =>

        isValidResource(
          r.url,
          r.title,
          query
        )

      )

      .sort((a, b) =>

        getTrustScore(b.url) -
        getTrustScore(a.url)

      )

      .slice(0, 5)

      .map(r => ({

        title: r.title,

        url: (r.url || "")
          .split("](")[0]
          .replace(/\)+$/, "")
          .trim()

      }));


    return filtered;

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