const axios = require("axios");
const SEARX_INSTANCES = [

  "https://search.bus-hit.me/search",

  "https://searxng.site/search",

  "https://northboot.xyz/search",

  "https://search.ononoki.org/search",

  "https://xo.wtf/search"

];

/* ===================================== */
/* BLOCKED DOMAINS */
/* ===================================== */

const blockedDomains = [

  /* Competitors */
  "comptia.org",
  "udemy.com",
  "coursera.org",
  "edx.org",
  "skillsoft.com",
  "infosecinstitute.com",

  /* Unsafe */
  ".onion",
  "darkweb",
  "deepweb",
  "tor.link",

  /* Low Quality */
  "reddit.com",
  "quora.com",
  "brainly",
  "coursehero",
  "chegg"

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
  if (url.includes("fortinet")) return 8;
  if (url.includes("paloalto")) return 8;
  if (url.includes("crowdstrike")) return 8;
  if (url.includes("rapid7")) return 8;
  if (url.includes("splunk")) return 8;
  if (url.includes("portswigger")) return 8;
  if (url.includes("sans")) return 8;

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

  /* REQUIRE AT LEAST ONE STRONG MATCH */

  return keywords.some(keyword =>
    text.includes(keyword)
  );
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
    !url.includes("apply") &&
    !url.includes("admission") &&
    !url.includes("degree") &&
    !url.includes("catalog") &&
    !url.includes("certification") &&

    /* BLOCK GENERIC HOMEPAGES */
    !url.endsWith(".org/") &&
    !url.endsWith(".com/") &&
    !url.endsWith(".gov/") &&
    !url.endsWith(".edu/") &&

    /* BLOCK GENERIC TOP PAGES */
    !(
      title.includes("top 10") &&
      !query.includes("top 10")
    ) &&

    !title.includes("cybersecurity framework") &&

    /* BLOCK BAD TITLES */
    !title.includes("not found") &&
    !title.includes("access denied") &&
    !title.includes("page not found") &&

    /* REQUIRE TOPIC MATCH */
    isTopicRelevant(title, query, url)

  );
}

/* ===================================== */
/* CLEAN URL */
/* ===================================== */

function cleanUrl(url = "") {

  return url
    .split("](")[0]
    .replace(/\)+$/, "")
    .trim();

}

/* ===================================== */
/* TRUSTED WEB SEARCH */
/* ===================================== */
async function searxSearch(query) {

  for (const instance of SEARX_INSTANCES) {

    try {

      console.log(
        "Trying Searx instance:",
        instance
      );

      const response = await axios.get(
  instance,
  {
    params: {
      q: query,
      format: "json",
      language: "en"
    },

    headers: {
      "User-Agent":
        "Mozilla/5.0"
    },

    timeout: 15000
  }
);

      const results =
        response.data.results || [];

      if (results.length > 0) {

        console.log(
          "Searx success:",
          results.length
        );

        return results
          .slice(0, 10)
          .map(r => ({
            title: r.title,
            url: r.url
          }));

      }

    } catch (err) {

      console.log(
        "Searx instance failed:",
        instance
      );

    }

  }

  return [];

}

async function trustedWebSearch(query) {

  try {

    /* ===================================== */
   /* ENHANCED SEARCH QUERY */
    /* ===================================== */

    const enhancedQuery = `
${query}

cybersecurity
educational resources
official documentation
tutorial
`;

    /* ===================================== */
/* SEARX SEARCH */
/* ===================================== */

console.log(
  "RUNNING SEARX SEARCH..."
);

let filtered =
  await searxSearch(enhancedQuery);

filtered = filtered

  .filter(r =>

    isValidResource(
      r.url,
      r.title,
      query
    )

  )

  .filter((item, index, self) =>

    index === self.findIndex(t =>
      t.url === item.url
    )

  )

  .sort((a, b) =>

    getTrustScore(b.url) -
    getTrustScore(a.url)

  )

  .slice(0, 5)

  .map(r => ({

    title: r.title,

    url: cleanUrl(r.url)

  }));

console.log(
  "SEARX FILTERED RESULTS:",
  filtered
);

    /* ===================================== */
    /* RETURN SEARCH RESULTS */
    /* ===================================== */

    if (filtered.length > 0) {

      return filtered;

    }

    /* ===================================== */
    /* TAVILY FALLBACK */
    /* ===================================== */

    console.log(
      "Searx failed. Using Tavily fallback..."
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

        url: cleanUrl(r.url)

      }));

    console.log(
      "TAVILY FILTERED RESULTS:",
      filtered
    );

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