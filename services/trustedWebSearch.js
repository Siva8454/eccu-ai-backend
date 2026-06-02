const axios = require("axios");
const NodeCache = require("node-cache");
const webCache = new NodeCache({

  stdTTL: 604800,

  checkperiod: 120

});
async function searxngSearch(query) {

  try {

    console.log(
      "RUNNING SEARXNG SEARCH..."
    );

    const response = await axios.get(
      "https://search.eccu.edu/search",
      {
        params: {
          q: query,
          format: "json"
        },
        timeout: 15000
      }
    );

    const results =
      response.data.results || [];

    console.log(
      "RAW SEARXNG RESULTS:",
      results.length
    );

    return results.map(r => ({

      title:
        r.title || "",

      url:
        r.url || "",

      content:
        r.content || ""

    }));

  } catch (err) {

    console.log(
      "SearXNG failed:",
      err.message
    );

    return [];

  }

}

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

  if (url.includes(".edu")) return 10;
  if (url.includes(".gov")) return 10;

  if (url.includes("britannica")) return 9;
  if (url.includes("khanacademy")) return 9;

  if (url.includes("apa.org")) return 9;
  if (url.includes("nih.gov")) return 9;

  if (url.includes("microsoft")) return 8;
  if (url.includes("aws")) return 8;
  if (url.includes("google")) return 8;

  return 6;
}

/* ===================================== */
/* TOPIC RELEVANCE */
/* ===================================== */

function isTopicRelevant(title, query, url = "") {

  const text =
    `${title} ${url}`.toLowerCase();

  const q =
    query.toLowerCase();

  /* XSS SPECIAL HANDLING */

  if (
    q.includes("xss") &&
    (
      text.includes("xss") ||
      text.includes("cross-site scripting")
    )
  ) {
    return true;
  }

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

  if (keywords.length === 0)
    return true;

  return keywords.some(keyword =>
    text.includes(keyword)
  );

}

/* ===================================== */
/* VALID RESOURCE FILTER */
/* ===================================== */

function isValidResource(url, title = "", query = "") {

  if (!url) return false;

  url = (url || "").toLowerCase();
  title = (title || "").toLowerCase();
  query = (query || "").toLowerCase();

  console.log(
  "VALIDATING:",
  title,
  url
  );

  return (

    /* BLOCK BAD DOMAINS */
    !blockedDomains.some(domain =>
      url.includes(domain)
    ) &&

    


    /* BLOCK BAD TITLES */
    !title.includes("not found") &&
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

function normalizeCacheKey(query = "") {

  return query
    .toLowerCase()

    /* REMOVE COMMON QUESTION WORDS */
    .replace(
      /\b(what|is|explain|define|tell|me|about|how|does|do|can|you)\b/g,
      ""
    )

    /* REMOVE EXTRA SPACES */
    .replace(/\s+/g, " ")

    .trim();

}

async function trustedWebSearch(query) {

  const cacheKey =
  normalizeCacheKey(query);

  const cached =
  webCache.get(cacheKey);

if (cached) {

  console.log(
    "CACHE HIT:",
    query
  );

  return cached;

}

  try {

    /* ===================================== */
   /* ENHANCED SEARCH QUERY */
    /* ===================================== */

    const enhancedQuery = `
${query}

educational resources
learning material
tutorial
reference
`;

    /* ===================================== */
/* SCRAPINGDOG SEARCH */
/* ===================================== */

let filtered =
  await searxngSearch(
    enhancedQuery
  );

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
  "SEARXNG FILTERED RESULTS:",
  filtered
);

    /* ===================================== */
    /* RETURN SEARCH RESULTS */
    /* ===================================== */

    if (filtered.length > 0) {

      console.log(
  "FINAL FILTERED:",
  filtered
);

    webCache.set(
  cacheKey,
  filtered
);
      return filtered;

    }

    /* ===================================== */
    /* TAVILY FALLBACK */
    /* ===================================== */

    console.log(
      "SearXNG failed. Using Tavily fallback..."
    );

    const response = await axios.post(

      "https://api.tavily.com/search",

      {

        api_key:
          process.env.TAVILY_API_KEY,

        query: `
${query}

Find trusted educational resources related to the topic.

STRICT RULES:
- Return direct topic-specific pages only
- Prioritize educational and authoritative sources
- Avoid homepage links
- Avoid discussion forums
- Avoid spam websites
- Avoid broken URLs

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

      console.log(
  "RAW TAVILY RESULTS:",
  tavilyResults
);

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

    webCache.set(
  cacheKey,
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