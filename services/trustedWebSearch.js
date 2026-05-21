const axios = require("axios");
async function scrapingDogSearch(query) {

  try {

    console.log(
      "RUNNING SCRAPINGDOG SEARCH..."
    );

    const response = await axios.get(
      "https://api.scrapingdog.com/google",
      {
        params: {
          api_key:
            process.env.SCRAPINGDOG_API_KEY,
          query
        },
        timeout: 15000
      }
    );

    const results =
      response.data || [];

    console.log(
      "RAW SCRAPINGDOG RESULTS:",
      results.length
    );

    return results.map(r => ({

      title:
        r.title || "",

      url:
        r.link || ""

    }));

  } catch (err) {

    console.log(
      "ScrapingDog failed:",
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

  return keywords.length === 0 ||

  keywords.some(keyword =>
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

    

    /* BLOCK GENERIC TOP PAGES */
    !(
      title.includes("top 10") &&
      !query.includes("top 10")
    ) &&


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
    instance,
    err.message
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
/* SCRAPINGDOG SEARCH */
/* ===================================== */

let filtered =
  await scrapingDogSearch(
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
  "SCRAPINGDOG FILTERED RESULTS:",
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

      return filtered;

    }

    /* ===================================== */
    /* TAVILY FALLBACK */
    /* ===================================== */

    console.log(
      "ScrapingDog failed. Using Tavily fallback..."
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