const { QdrantClient } =
  require("@qdrant/js-client-rest");

const {
  getLocalEmbedding
} = require("./localEmbedding");

const courseMappings =
  require("../config/courseMappings");

const courseConfigs =
  require("../config/courseConfig");


/* -------------------------------------------------- */
/* QDRANT CLIENT */
/* -------------------------------------------------- */

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    timeout: 60000,
    checkCompatibility: false
});


/* -------------------------------------------------- */
/* MODULE DETECTOR */
/* -------------------------------------------------- */

function detectModuleNumber(question = "") {

  const match =
    question.match(
      /module\s*0*(\d+)/i
    );

  if (match) {

    return Number(
      match[1]
    );

  }

  return null;

}


/* -------------------------------------------------- */
/* COURSE CODE DETECTOR */
/* -------------------------------------------------- */

function detectCourseCode(question = "") {

  const match =
    question.match(
      /[A-Z]{2,5}\s?\d{3}/i
    );

  if (match) {

    return match[0]
      .toUpperCase()
      .replace(/\s+/, " ");

  }

  return null;

}


/* -------------------------------------------------- */
/* GET COURSE COLLECTION */
/* -------------------------------------------------- */

function getCourseCollection(
  allowedCourseIds = []
) {

  if (
    !Array.isArray(
      allowedCourseIds
    ) ||
    !allowedCourseIds.length
  ) {

    return null;

  }


  /*
   * The first allowed Canvas course ID
   * determines the course configuration.
   */

  const courseId =
    Number(
      allowedCourseIds[0]
    );


  const configKey =
    courseMappings[courseId];


  if (!configKey) {

    console.warn(
      `⚠️ No course mapping found for Canvas Course ID ${courseId}`
    );

    return null;

  }


  const config =
    courseConfigs[configKey];


  if (!config) {

    console.error(
      `❌ Config "${configKey}" not found in courseConfig.js`
    );

    return null;

  }


  if (!config.collection) {

    console.error(
      `❌ No Qdrant collection configured for ${configKey}`
    );

    return null;

  }


  console.log(
    `🔗 Course Config: ${configKey}`
  );

  console.log(
    `🗄️ Qdrant Collection: ${config.collection}`
  );


  return {
    collection:
      config.collection,

    configKey,

    courseId

  };

}


/* -------------------------------------------------- */
/* MAIN VECTOR SEARCH */
/* -------------------------------------------------- */

async function vectorSearch(

  question,

  allowedCourseIds = [],

  intent,

  currentPage,

  wantsLabs = false,

  wantsLabExplanation = false,

  wantsCourseWideSearch = false

) {


  /* ==================================================
     COURSE COLLECTION
     ================================================== */

  const courseInfo =
    getCourseCollection(
      allowedCourseIds
    );


  /*
   * IMPORTANT:
   * If we cannot identify the course collection,
   * DO NOT search another/global collection.
   *
   * This prevents cross-course retrieval.
   */

  if (!courseInfo) {

    console.error(
      "❌ Cannot determine course collection. Search aborted."
    );

    return {

      context: "",

      confidence: 0,

      rawScore: 0

    };

  }


  const COLLECTION =
    courseInfo.collection;


  /* ==================================================
     CURRENT PAGE BEHAVIOR
     ================================================== */

  if (
    wantsCourseWideSearch
  ) {

    currentPage = null;

  }


  console.log(
    "🔎 Vector search:",
    question
  );

  console.log(
    "📄 Current Page:",
    currentPage
  );

  console.log(
    "🗄️ SEARCH COLLECTION:",
    COLLECTION
  );

  console.log(
    "🎯 COURSE CONFIG:",
    courseInfo.configKey
  );

  console.log(
    "🎯 ALLOWED COURSE IDS:",
    allowedCourseIds
  );


  /* ==================================================
     MODULE DETECTION
     ================================================== */

  const requestedModule =
    detectModuleNumber(
      question
    );


  if (
    requestedModule
  ) {

    console.log(
      `📚 Requested Module: ${requestedModule}`
    );

  }


  /* ==================================================
     EMBEDDING
     ================================================== */

  const embedding =
    await getLocalEmbedding(
      question
    );


  /* ==================================================
     VECTOR SEARCH
     ================================================== */

  let results =
    await client.search(

      COLLECTION,

      {

        vector:
          embedding,

        limit:
          wantsCourseWideSearch
            ? 50
            : 20

      }

    );


  if (
    !results.length
  ) {

    console.log(
      "❌ No results found in vector DB"
    );

    return {

      context: "",

      confidence: 0,

      rawScore: 0

    };

  }


  console.log(
    "Raw results:",
    results.length
  );


  /* ==================================================
     TOP RAW RESULTS
     ================================================== */

  console.log(
    "TOP RESULTS:"
  );


  results
    .slice(0, 10)
    .forEach(r => {

      console.log(

        "TITLE:",
        r.payload?.title,

        "| MODULE:",
        r.payload?.moduleName,

        "| MODULE NUMBER:",
        r.payload?.moduleNumber,

        "| COURSE:",
        r.payload?.courseId,

        "| SCORE:",
        r.score

      );

    });


  /* ==================================================
     COURSE SAFETY FILTER
     ================================================== */

  /*
   * We already searched the correct collection.
   *
   * But we ALSO keep this payload-level course ID
   * filter as a second safety layer.
   *
   * This is useful because one collection may contain
   * the Master Blueprint + Term copies of a course.
   */

  if (
    allowedCourseIds.length
  ) {

    console.log(
      "🔐 Applying course ID safety filter..."
    );

    console.log(
      "BEFORE FILTER:",
      results.length
    );


    results =
      results.filter(
        r => {

          const vectorCourseId =
            Number(
              r.payload?.courseId
            );


          const match =
            allowedCourseIds
              .map(Number)
              .includes(
                vectorCourseId
              );


          console.log(

            "VECTOR COURSE:",
            vectorCourseId,

            "MATCH:",
            match

          );


          return match;

        }
      );


    console.log(
      "AFTER FILTER:",
      results.length
    );

  }


  if (
    !results.length
  ) {

    console.log(
      "❌ No results remain after course filtering"
    );

    return {

      context: "",

      confidence: 0,

      rawScore: 0

    };

  }


  /* ==================================================
     BOOSTING LOGIC
     ================================================== */

  results =
    results.map(
      r => {

        let score =
          r.score;

        const p =
          r.payload || {};


        /* --------------------------------------------
           PRIORITY 1 — CURRENT PAGE
           -------------------------------------------- */

        if (

          !wantsCourseWideSearch &&

          currentPage?.url &&

          p.pageUrl &&

          currentPage.url ===
            p.pageUrl

        ) {

          score += 0.4;

        }


        /* --------------------------------------------
           PRIORITY 2 — EXACT MODULE NUMBER
           -------------------------------------------- */

        if (

          requestedModule !== null &&

          Number(
            p.moduleNumber
          ) === requestedModule

        ) {

          score += 0.35;

        }


        /* --------------------------------------------
           PRIORITY 3 — MODULE NAME MATCH
           -------------------------------------------- */

        if (

          p.moduleName &&

          question
            .toLowerCase()
            .includes(
              p.moduleName
                .toLowerCase()
            )

        ) {

          score += 0.2;

        }


        /* --------------------------------------------
           PRIORITY 4 — TITLE MATCH
           -------------------------------------------- */

        if (

          p.title &&

          question
            .toLowerCase()
            .includes(
              p.title
                .toLowerCase()
            )

        ) {

          score += 0.2;

        }


        /* --------------------------------------------
           PRIORITY 5 — CURRENT PAGE TITLE
           -------------------------------------------- */

        if (

          !wantsCourseWideSearch &&

          currentPage?.title &&

          p.title &&

          currentPage.title
            .toLowerCase()
            .includes(
              p.title
                .toLowerCase()
            )

        ) {

          score += 0.35;

        }


        return {

          ...r,

          boostedScore:
            score

        };

      }
    );


  /* ==================================================
     SORT BY BOOSTED SCORE
     ================================================== */

  results.sort(
    (a, b) =>
      b.boostedScore -
      a.boostedScore
  );


  /* ==================================================
     DEBUG TOP RESULTS
     ================================================== */

  console.log(
    "\n🎯 TOP BOOSTED RESULTS:"
  );


  results
    .slice(0, 10)
    .forEach(
      r => {

        console.log(

          r.payload?.title,

          "| MODULE:",
          r.payload?.moduleName,

          "| MODULE NUMBER:",
          r.payload?.moduleNumber,

          "| TYPE:",
          r.payload?.type,

          "| RAW:",
          r.score,

          "| BOOSTED:",
          r.boostedScore

        );

      }
    );


  /* ==================================================
     SELECT TOP RESULTS
     ================================================== */

  const topResults =
    results

      .filter(
        r =>
          r.boostedScore >
          0.6
      )

      .slice(

        0,

        wantsCourseWideSearch

          ? 10

          : wantsLabs

            ? 25

            : 3

      );


  if (
    !topResults.length
  ) {

    console.log(
      "⚠️ No results passed confidence threshold."
    );

    return {

      context: "",

      confidence: 0,

      rawScore: 0

    };

  }


  /* ==================================================
     BUILD CONTEXT
     ================================================== */

  let context =
    topResults

      .map(
        r => {

          const p =
            r.payload || {};


          const links =
            (p.links || [])

              .map(
                l =>
                  `${l.text} → ${l.url}`
              )

              .join(
                "\n\n----------------\n\n"
              );


          return `

Course: ${p.courseName || ""}

Module: ${p.moduleName || "N/A"}

Module Number: ${
  p.moduleNumber !== undefined &&
  p.moduleNumber !== null
    ? p.moduleNumber
    : "N/A"
}

Title: ${p.title || ""}

Content:
${(p.content || "").slice(0, 1200)}

Resources:
${links}

Type: ${p.type || ""}
`;

        }
      )

      .join(
        "\n\n----------------\n\n"
      );


  /* ==================================================
     LAB HANDLING
     ================================================== */

  if (
    wantsLabs &&
    !wantsLabExplanation
  ) {

    const labItems = [];


    topResults.forEach(
      r => {

        const title =
          (
            r.payload?.title ||
            ""
          ).toLowerCase();


        const content =
          (
            r.payload?.content ||
            ""
          ).toLowerCase();


        if (

          title.includes(
            "lab"
          ) ||

          title.includes(
            "skillable"
          ) ||

          title.includes(
            "exercise"
          ) ||

          content.includes(
            "skillable"
          ) ||

          content.includes(
            "hands-on"
          ) ||

          content.includes(
            "lab assignment"
          ) ||

          content.includes(
            "practical exercise"
          )

        ) {

          labItems.push(
            r.payload.title
          );

        }

      }
    );


    if (
      labItems.length
    ) {

      context += `

VERIFIED LAB ASSIGNMENTS:

${labItems
  .map(
    l => `- ${l}`
  )
  .join("\n")}

IMPORTANT:

Only the above lab titles were found
in retrieved course content.

Do not invent additional labs.

Do not infer labs from module names.

`;

    } else {

      return {

        context: `

No lab assignment pages were identified
in the retrieved course content.

If this course contains labs, they are
typically available within the Modules
section of Canvas. Please open Modules
and look for Lab Assignments, Skillable
Labs, Hands-on Exercises, or Practical
Activities.

`,

        confidence: 1,

        rawScore: 1

      };

    }

  }


  /* ==================================================
     FINAL LOGGING
     ================================================== */

  console.log(
    "\n========================================"
  );

  console.log(
    "🔎 FINAL VECTOR SEARCH"
  );

  console.log(
    "Course Config:",
    courseInfo.configKey
  );

  console.log(
    "Collection:",
    COLLECTION
  );

  console.log(
    "Course IDs:",
    allowedCourseIds
  );

  console.log(
    "Course Wide Search:",
    wantsCourseWideSearch
  );

  console.log(
    "Requested Module:",
    requestedModule
  );

  console.log(
    "Final Context Size:",
    context.length
  );

  console.log(
    "========================================"
  );


  topResults.forEach(
    r => {

      console.log(

        "SELECTED:",

        r.payload?.title,

        "| MODULE:",
        r.payload?.moduleName,

        "| MODULE NUMBER:",
        r.payload?.moduleNumber

      );

    }
  );


  /* ==================================================
     RETURN
     ================================================== */

  return {

    context,

    confidence:
      topResults[0]
        .boostedScore,

    rawScore:
      topResults[0]
        .score

  };

}


module.exports = {
  vectorSearch
};