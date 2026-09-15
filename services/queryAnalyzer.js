const {
  getMemory,
  saveMemory
} = require("./memoryStore");


/* =========================================================
   ANALYZE QUERY
   ========================================================= */

function analyzeQuery(
  question,
  userId
) {

  if (
    !question ||
    typeof question !== "string"
  ) {

    return {

      type: null,

      moduleName: null,

      wantsModuleSummary: false,

      wantsPageSearch: false

    };

  }


  const memory =
    userId
      ? getMemory(userId)
      : {};


  const q =
    question
      .toLowerCase()
      .trim();


  let type =
    null;


  let moduleName =
    null;


  /* =======================================================
     TYPE DETECTION
     ======================================================= */

  if (

    q.includes("assignment") ||

    q.includes("submit") ||

    q.includes("submission") ||

    q.includes("due") ||

    q.includes("deadline")

  ) {

    type =
      "assignment";

  }


  else if (

    q.includes("discussion") ||

    q.includes("discussion thread") ||

    q.includes("peer reply") ||

    q.includes("reply to peers")

  ) {

    type =
      "discussion";

  }


  else if (

    q.includes("file") ||

    q.includes("pdf") ||

    q.includes("template") ||

    q.includes("document") ||

    q.includes("download")

  ) {

    type =
      "file";

  }


  else if (

    q.includes("syllabus") ||

    q.includes("grading") ||

    q.includes("grade") ||

    q.includes("attendance")

  ) {

    type =
      "syllabus";

  }


  /* =======================================================
     MODULE DETECTION
     ======================================================= */

  const moduleMatch =
    q.match(
      /\bmodule\s*(\d+)\b/i
    );


  if (
    moduleMatch
  ) {

    const num =
      moduleMatch[1]
        .padStart(2, "0");


    moduleName =
      `Module ${num}`;

  }


  /* =======================================================
     MEMORY FALLBACK
     ======================================================= */

  if (
    !moduleName &&
    memory?.moduleName
  ) {

    moduleName =
      memory.moduleName;

  }


  if (
    !type &&
    memory?.type
  ) {

    type =
      memory.type;

  }


  /* =======================================================
     SAVE RELEVANT MEMORY
     ======================================================= */

  if (
    userId
  ) {

    saveMemory(

      userId,

      {

        moduleName:
          moduleName || null,

        type:
          type || null

      }

    );

  }


  /* =======================================================
     MODULE SUMMARY DETECTION
     ======================================================= */

  const wantsModuleSummary =

    /(summar(y|ize)|overview|teach|explain|walk\s*me\s*through)/i
      .test(q)

    &&

    /\bmodule\s*\d+\b/i
      .test(q);


  /* =======================================================
     PAGE / COURSE CONTENT SEARCH
     ======================================================= */

  const wantsPageSearch =

    /\bmodule\b/i.test(q)

    ||

    /\bassignment\b/i.test(q)

    ||

    /\bdiscussion\b/i.test(q)

    ||

    /\blab\b/i.test(q)

    ||

    /\bresource\b/i.test(q)

    ||

    /\bweek\b/i.test(q)

    ||

    /\bpage\b/i.test(q)

    ||

    /\blesson\b/i.test(q);


  /* =======================================================
     RETURN ANALYSIS
     ======================================================= */

  return {

    type,

    moduleName,

    wantsModuleSummary,

    wantsPageSearch

  };

}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {

  analyzeQuery

};