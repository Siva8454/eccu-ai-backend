const fs = require("fs");
const path = require("path");

const courseMappings =
  require("../config/courseMappings");

const KNOWLEDGE_STORE_PATH =
  path.join(
    __dirname,
    "../data/knowledgeStore.json"
  );


/* =========================================================
   LOAD KNOWLEDGE STORE
   ========================================================= */

function loadKnowledgeStore() {

  try {

    if (!fs.existsSync(KNOWLEDGE_STORE_PATH)) {

      console.log(
        "⚠️ knowledgeStore.json not found"
      );

      return null;
    }

    return JSON.parse(
      fs.readFileSync(
        KNOWLEDGE_STORE_PATH,
        "utf8"
      )
    );

  } catch (err) {

    console.error(
      "❌ Failed to load knowledgeStore.json:",
      err.message
    );

    return null;
  }
}


/* =========================================================
   MAIN SEARCH FUNCTION
   ========================================================= */

/**
 * Search the local knowledge store.
 *
 * IMPORTANT:
 * - Global rules are allowed.
 * - Course content is restricted to the supplied course IDs.
 * - No global cross-course content search.
 *
 * @param {string} query
 * @param {number|number[]} allowedCourseIds
 */

function searchKnowledge(
  query,
  allowedCourseIds = []
) {

  if (
    !query ||
    typeof query !== "string"
  ) {

    return null;
  }


  const store =
    loadKnowledgeStore();


  if (!store) {

    return null;
  }


  const normalizedQuery =
    normalize(query);


  /* =======================================================
     1. GLOBAL RULE MATCH
     ======================================================= */

  const ruleMatch =
    store.rules?.find(rule => {

      if (!rule?.trigger) {
        return false;
      }

      return normalizedQuery.includes(
        normalize(rule.trigger)
      );

    });


  if (ruleMatch) {

    return {

      type: "rule",

      answer:
        ruleMatch.response,

      confidence:
        0.95

    };
  }


  /* =======================================================
     2. NORMALIZE COURSE IDS
     ======================================================= */

  const courseIds =
    Array.isArray(
      allowedCourseIds
    )
      ? allowedCourseIds
          .map(Number)
          .filter(
            id => Number.isFinite(id)
          )
      : [
          Number(
            allowedCourseIds
          )
        ].filter(
          id => Number.isFinite(id)
        );


  /*
   * If no course is supplied, DO NOT perform a global
   * course-content search.
   *
   * This is important for course isolation.
   */

  if (
    courseIds.length === 0
  ) {

    console.log(
      "⚠️ knowledgeSearch blocked: no allowed course IDs"
    );

    return null;
  }


  /* =======================================================
     3. RESOLVE ALLOWED COURSE CONFIGURATIONS
     ======================================================= */

  const allowedConfigKeys =
    new Set();


  for (
    const courseId
    of courseIds
  ) {

    const configKey =
      courseMappings[
        Number(courseId)
      ];


    if (configKey) {

      allowedConfigKeys.add(
        configKey
      );

    }

  }


  /*
   * If the course is not mapped, fail closed.
   */

  if (
    allowedConfigKeys.size === 0
  ) {

    console.log(
      "⚠️ knowledgeSearch blocked: no course mapping found",
      courseIds
    );

    return null;
  }


  /* =======================================================
     4. COURSE CONTENT SEARCH
     ======================================================= */

  const matches = [];


  for (
    const course
    of store.courses || []
  ) {

    const courseId =
      Number(
        course.courseId ??
        course.id
      );


    /*
     * COURSE ISOLATION
     *
     * Only search courses explicitly allowed
     * for the current course configuration.
     */

    if (
      !courseIds.includes(
        courseId
      )
    ) {

      continue;
    }


    /*
     * Additional mapping safety check.
     */

    const courseConfigKey =
      courseMappings[
        courseId
      ];


    if (
      !courseConfigKey ||
      !allowedConfigKeys.has(
        courseConfigKey
      )
    ) {

      continue;
    }


    for (
      const module
      of course.modules || []
    ) {

      for (
        const item
        of module.items || []
      ) {

        const score =
          calculateScore(
            normalizedQuery,
            item
          );


        if (
          score <= 0
        ) {

          continue;
        }


        const content =
          cleanContent(
            item.content ||
            item.body ||
            item.description ||
            ""
          );


        if (
          !content
        ) {

          continue;
        }


        matches.push({

          courseId,

          courseName:
            course.courseName ||
            course.name ||
            "",

          moduleName:
            module.moduleName ||
            module.name ||
            "",

          title:
            item.title ||
            item.name ||
            "",

          content,

          score

        });

      }

    }

  }


  /* =======================================================
     5. NO MATCH
     ======================================================= */

  if (
    matches.length === 0
  ) {

    return null;
  }


  /* =======================================================
     6. SORT BY BEST MATCH
     ======================================================= */

  matches.sort(
    (a, b) =>
      b.score - a.score
  );


  const best =
    matches[0];


  /* =======================================================
     7. RETURN RESULT
     ======================================================= */

  return {

    type:
      "content",

    answer:
      formatAnswer(best),

    confidence:
      Math.min(
        0.9,
        best.score / 10
      )

  };
}


/* =========================================================
   CLEAN CONTENT
   ========================================================= */

function cleanContent(
  content
) {

  if (
    !content ||
    typeof content !== "string"
  ) {

    return "";
  }


  return content

    .replace(/\\n/g, " ")

    .replace(/\\"/g, '"')

    .replace(/<[^>]*>/g, " ")

    .replace(/\s+/g, " ")

    .trim();

}


/* =========================================================
   NORMALIZE
   ========================================================= */

function normalize(
  text
) {

  return String(
    text || ""
  )

    .toLowerCase()

    .replace(
      /[^\w\s]/g,
      ""
    )

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   CALCULATE SCORE
   ========================================================= */

function calculateScore(
  query,
  item
) {

  let score = 0;


  const title =
    normalize(
      item.title
    );


  const content =
    normalize(
      item.content ||
      item.body ||
      item.description ||
      ""
    );


  const tags =
    Array.isArray(
      item.tags
    )
      ? item.tags.map(
          normalize
        )
      : [];


  /* -------------------------------------------------------
     Exact title match
     ------------------------------------------------------- */

  if (
    title &&
    title.includes(
      query
    )
  ) {

    score += 5;

  }


  /* -------------------------------------------------------
     Tag matches
     ------------------------------------------------------- */

  for (
    const tag
    of tags
  ) {

    if (
      !tag
    ) {

      continue;
    }


    if (
      query.includes(tag) ||
      tag.includes(query)
    ) {

      score += 3;

    }

  }


  /* -------------------------------------------------------
     Content match
     ------------------------------------------------------- */

  if (
    content &&
    content.includes(
      query
    )
  ) {

    score += 2;

  }


  return score;

}


/* =========================================================
   FORMAT ANSWER
   ========================================================= */

function formatAnswer(
  result
) {

  return `

${result.title}

${result.content}

Source:

${result.courseName} → ${result.moduleName}

`.trim();

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

  searchKnowledge

};