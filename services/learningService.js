const fs = require("fs");
const path = require("path");

const courseMappings =
  require("../config/courseMappings");


const LEARN_FILE =
  path.join(
    __dirname,
    "../data/learned-knowledge.json"
  );


/* =========================================================
   LOAD STORE
   ========================================================= */

function loadStore() {

  try {

    if (
      !fs.existsSync(
        LEARN_FILE
      )
    ) {

      return {
        qa: []
      };

    }


    const data =
      fs.readFileSync(
        LEARN_FILE,
        "utf8"
      );


    if (!data.trim()) {

      return {
        qa: []
      };

    }


    const store =
      JSON.parse(data);


    if (
      !Array.isArray(
        store.qa
      )
    ) {

      store.qa = [];

    }


    return store;

  } catch (err) {

    console.error(
      "❌ Failed to load learned knowledge:",
      err.message
    );


    return {
      qa: []
    };

  }

}


/* =========================================================
   SAVE STORE
   ========================================================= */

function saveStore(
  store
) {

  try {

    fs.writeFileSync(

      LEARN_FILE,

      JSON.stringify(
        store,
        null,
        2
      )

    );

    return true;

  } catch (err) {

    console.error(
      "❌ Failed to save learned knowledge:",
      err.message
    );

    return false;

  }

}


/* =========================================================
   NORMALIZE QUESTION
   ========================================================= */

function normalizeQuestion(
  question
) {

  return String(
    question || ""
  )

    .toLowerCase()

    .replace(
      /\s+/g,
      " "
    )

    .trim();

}


/* =========================================================
   RESOLVE COURSE CONFIG
   ========================================================= */

function resolveCourseConfig(
  courseId
) {

  if (
    courseId === undefined ||
    courseId === null
  ) {

    return null;

  }


  const numericCourseId =
    Number(
      courseId
    );


  if (
    !Number.isFinite(
      numericCourseId
    )
  ) {

    return null;

  }


  return (
    courseMappings[
      numericCourseId
    ] ||
    null
  );

}


/* =========================================================
   SAVE Q&A
   ========================================================= */

/**
 * Save a learned question/answer pair.
 *
 * IMPORTANT:
 * Every learned answer is associated with a course.
 *
 * @param {string} question
 * @param {string} answer
 * @param {number} courseId
 */

function saveQA(
  question,
  answer,
  courseId
) {

  if (
    !question ||
    !answer
  ) {

    return false;

  }


  const normalizedQuestion =
    normalizeQuestion(
      question
    );


  if (
    !normalizedQuestion
  ) {

    return false;

  }


  const configKey =
    resolveCourseConfig(
      courseId
    );


  /*
   * Do not store course content without a valid
   * course mapping.
   */

  if (
    !configKey
  ) {

    console.log(
      "⚠️ Learned knowledge NOT saved: unmapped course",
      courseId
    );

    return false;

  }


  const store =
    loadStore();


  /* =======================================================
     DUPLICATE CHECK
     ======================================================= */

  const duplicate =
    store.qa.find(
      item =>

        normalizeQuestion(
          item.question
        ) ===
        normalizedQuestion

        &&

        Number(
          item.courseId
        ) ===
        Number(
          courseId
        )

    );


  if (
    duplicate
  ) {

    console.log(
      "ℹ️ Learned Q&A already exists:",
      question
    );

    return false;

  }


  /* =======================================================
     SAVE
     ======================================================= */

  store.qa.push({

    question:
      normalizedQuestion,

    answer,

    courseId:
      Number(
        courseId
      ),

    configKey,

    createdAt:
      new Date().toISOString()

  });


  return saveStore(
    store
  );

}


/* =========================================================
   SEARCH LEARNED KNOWLEDGE
   ========================================================= */

/**
 * Search learned answers for the current course only.
 *
 * @param {string} question
 * @param {number|number[]} allowedCourseIds
 */

function searchLearned(
  question,
  allowedCourseIds = []
) {

  if (
    !question ||
    typeof question !== "string"
  ) {

    return null;

  }


  const store =
    loadStore();


  if (
    !store.qa.length
  ) {

    return null;

  }


  /* =======================================================
     NORMALIZE ALLOWED COURSE IDS
     ======================================================= */

  const courseIds =
    Array.isArray(
      allowedCourseIds
    )

      ? allowedCourseIds
          .map(Number)
          .filter(
            id =>
              Number.isFinite(id)
          )

      : [

          Number(
            allowedCourseIds
          )

        ].filter(
          id =>
            Number.isFinite(id)
        );


  /*
   * Fail closed.
   *
   * Never perform a global learned-knowledge search.
   */

  if (
    courseIds.length === 0
  ) {

    console.log(
      "⚠️ searchLearned blocked: no allowed course IDs"
    );

    return null;

  }


  const normalizedQuestion =
    normalizeQuestion(
      question
    );


  /* =======================================================
     SEARCH COURSE-SPECIFIC KNOWLEDGE
     ======================================================= */

  for (
    const item
    of store.qa
  ) {

    const itemCourseId =
      Number(
        item.courseId
      );


    /*
     * Older learned records may not have courseId.
     *
     * Do NOT allow those records to bypass isolation.
     */

    if (
      !Number.isFinite(
        itemCourseId
      )
    ) {

      continue;

    }


    if (
      !courseIds.includes(
        itemCourseId
      )
    ) {

      continue;

    }


    const learnedQuestion =
      normalizeQuestion(
        item.question
      );


    if (
      normalizedQuestion.includes(
        learnedQuestion
      )

      ||

      learnedQuestion.includes(
        normalizedQuestion
      )

    ) {

      return {

        answer:
          item.answer,

        courseId:
          itemCourseId,

        configKey:
          item.configKey ||
          resolveCourseConfig(
            itemCourseId
          ),

        confidence:
          0.92

      };

    }

  }


  return null;

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

  saveQA,

  searchLearned

};