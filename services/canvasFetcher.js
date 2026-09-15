require("dotenv").config();

const axios = require("axios");

const courseMappings =
  require("../config/courseMappings");

console.log("🟢 UPDATED CANVAS FETCHER LOADED");


/* =========================================================
   CANVAS CONFIG
   ========================================================= */

const BASE =
  process.env.CANVAS_BASE_URL;

const TOKEN =
  process.env.CANVAS_TOKEN;


console.log(
  "BASE URL:",
  BASE
);

console.log(
  "TOKEN EXISTS:",
  !!TOKEN
);


/* =========================================================
   MASTER BLUEPRINT
   ========================================================= */

const MASTER_BLUEPRINT_TERM_ID = 297;


/* =========================================================
   DEV COURSE LIST
   =========================================================
   
   These are the 27 Master Blueprint course IDs
   that we want to index for Term 4.

   IMPORTANT:
   We intentionally use Master Blueprint IDs here.

   The Term 4 courses will later map to the
   same course configuration / Qdrant collection
   through courseMappings.js.
   ========================================================= */

const DEV_COURSES = [

  2725, // CIS 299
  2277, // CIS 303
  2269, // CIS 308
  2279, // CIS 406
  2457, // CIS 410
  2193, // COM 340
  2463, // CS 515

  2179, // ECCU 500
  2213, // ECCU 501
  2227, // ECCU 505
  2199, // ECCU 506
  2275, // ECCU 509
  2366, // ECCU 510
  2372, // ECCU 512
  2196, // ECCU 517

  2282, // ECCU 519 - General
  2363, // ECCU 519 - MCS
  2362, // ECCU 519 - MBA

  2294, // ECCU 523
  2287, // ECCU 525

  2716, // ECCU 560
  2721, // ECCU 565
  2726, // ECCU 570

  2221, // MGMT 502
  2339, // MGMT 512
  2380, // MGT 450
  2379  // NSE

];


/* =========================================================
   CANVAS API
   ========================================================= */

const api = axios.create({

  baseURL: BASE,

  headers: {
    Authorization:
      `Bearer ${TOKEN}`
  },

  timeout: 30000

});


/* =========================================================
   SLEEP
   ========================================================= */

const sleep =
  (ms) =>
    new Promise(
      resolve =>
        setTimeout(resolve, ms)
    );


/* =========================================================
   SAFE GET WITH RETRY
   ========================================================= */

async function safeGet(
  url,
  retries = 3
) {

  try {

    return await api.get(url);

  }

  catch (err) {

    if (retries > 0) {

      console.log(
        "⚠️ Retry:",
        url,
        "| Remaining:",
        retries
      );

      await sleep(1500);

      return safeGet(
        url,
        retries - 1
      );

    }

    console.error(
      "❌ Canvas API request failed:",
      url
    );

    console.error(
      "❌ Status:",
      err.response?.status
    );

    console.error(
      "❌ Error:",
      err.message
    );

    throw err;

  }

}


/* =========================================================
   PAGINATION
   ========================================================= */

async function paginate(url) {

  let results = [];

  while (url) {

    const res =
      await safeGet(url);

    if (Array.isArray(res.data)) {

      results.push(
        ...res.data
      );

    }

    const link =
      res.headers.link;

    const next =
      link?.match(
        /<([^>]+)>;\s*rel="next"/
      );

    url =
      next
        ? next[1]
            .replace(BASE, "")
        : null;

    await sleep(200);

  }

  return results;

}


/* =========================================================
   ACTIVE TERM DETECTION
   ========================================================= */

async function getActiveTermId() {

  const res =
    await safeGet(
      "/api/v1/accounts/1/terms"
    );

  const terms =
    res.data.enrollment_terms || [];


  /*
    Prefer an active term.

    Canvas can potentially have more than
    one active term, so log all active terms.
  */

  const activeTerms =
    terms.filter(
      t =>
        t.workflow_state ===
        "active"
    );


  if (!activeTerms.length) {

    throw new Error(
      "No active term found in Canvas"
    );

  }


  console.log(
    "🎯 Active Canvas Terms:"
  );


  activeTerms.forEach(term => {

    console.log(
      "   ",
      term.name,
      "| ID:",
      term.id
    );

  });


  /*
    Use the first active term for the
    normal active-term workflow.

    DEV mode below currently indexes only
    Master Blueprint courses, so this value
    is not used for selecting the 27 courses.
  */

  const active =
    activeTerms[0];


  console.log(
    "🎯 Selected Active Term:",
    active.name,
    "| ID:",
    active.id
  );


  return active.id;

}


/* =========================================================
   FETCH USER ENROLLMENTS
   ========================================================= */

async function fetchUserEnrollments() {

  return await paginate(

    "/api/v1/users/self/enrollments" +
    "?state[]=active&per_page=100"

  );

}


/* =========================================================
   VERIFY COURSE MAPPING
   ========================================================= */

function getCourseConfigKey(
  courseId
) {

  return (
    courseMappings[
      Number(courseId)
    ] || null
  );

}


/* =========================================================
   FETCH SELECTED COURSES
   ========================================================= */

async function fetchCourses() {

  console.log(
    "🔥 DEV MODE ACTIVE"
  );

  console.log(
    "🔥 Master Blueprint Term ID:",
    MASTER_BLUEPRINT_TERM_ID
  );

  console.log(
    "🔥 Courses requested:",
    DEV_COURSES.length
  );


  const activeTermId =
    await getActiveTermId();


  console.log(
    "📚 Fetching Canvas courses..."
  );


  const courses =
    await paginate(
      "/api/v1/accounts/1/courses?per_page=100"
    );


  console.log(
    "📚 Canvas returned:",
    courses.length,
    "courses"
  );


  /* =======================================================
     FILTER
     ======================================================= */

  const filtered =
    courses.filter(c => {

      const isAvailable =
        c.workflow_state ===
        "available";


      const isNotTestCourse =
        !c.name
          ?.toLowerCase()
          .includes("test");


      const isRequestedCourse =
        DEV_COURSES.includes(
          Number(c.id)
        );


      const isMasterBlueprint =
        Number(
          c.enrollment_term_id
        ) ===
        Number(
          MASTER_BLUEPRINT_TERM_ID
        );


      const isActiveTerm =
        Number(
          c.enrollment_term_id
        ) ===
        Number(
          activeTermId
        );


      /*
        We currently want the 27
        Master Blueprint courses.

        Keep active-term detection available
        for future Term 4 syncing, but don't
        accidentally include every active-term
        course during this development sync.
      */

      const isAllowedTerm =
        isMasterBlueprint ||
        isActiveTerm;


      return (

        isAvailable &&

        isNotTestCourse &&

        isRequestedCourse &&

        isAllowedTerm

      );

    });


  /* =======================================================
     VERIFY COURSE MAPPINGS
     ======================================================= */

  const validCourses = [];

  const unmappedCourses = [];


  filtered.forEach(course => {

    const configKey =
      getCourseConfigKey(
        course.id
      );


    if (!configKey) {

      unmappedCourses.push(
        course
      );

      console.error(
        "❌ COURSE HAS NO MAPPING:",
        course.name,
        "| ID:",
        course.id
      );

      return;

    }


    /*
      Store config key on the
      course object for easier
      debugging downstream.
    */

    course.aiTutorConfigKey =
      configKey;


    validCourses.push(
      course
    );

  });


  /* =======================================================
     LOG RESULTS
     ======================================================= */

  console.log(
    `✅ Courses selected for indexing: ${validCourses.length}`
  );


  validCourses.forEach(
    (course, index) => {

      console.log(

        `${index + 1}. 📘`,
        course.name,
        "| Canvas ID:",
        course.id,
        "| Term:",
        course.enrollment_term_id,
        "| Config:",
        course.aiTutorConfigKey

      );

    }
  );


  if (unmappedCourses.length) {

    console.error(
      "⚠️ Courses skipped because they have no courseMappings entry:"
    );


    unmappedCourses.forEach(
      course => {

        console.error(
          "   ❌",
          course.name,
          "| ID:",
          course.id
        );

      }
    );

  }


  /*
    IMPORTANT SAFETY CHECK

    We expect all 27 Master Blueprint
    courses to be mapped.

    Don't silently continue if one of
    the requested courses is missing.
  */

  if (
    validCourses.length !==
    DEV_COURSES.length
  ) {

    console.warn(

      `⚠️ Expected ${DEV_COURSES.length} mapped courses, but found ${validCourses.length}.`

    );

  }


  return validCourses;

}


/* =========================================================
   MODULES
   ========================================================= */

async function fetchModules(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/modules?per_page=100`

  );

}


/* =========================================================
   MODULE ITEMS
   ========================================================= */

async function fetchModuleItems(
  courseId,
  moduleId
) {

  return paginate(

    `/api/v1/courses/${courseId}/modules/${moduleId}/items?per_page=100`

  );

}


/* =========================================================
   PAGES
   ========================================================= */

async function fetchPages(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/pages?per_page=100`

  );

}


/* =========================================================
   PAGE BODY
   ========================================================= */

async function fetchPageBody(
  courseId,
  url
) {

  const res =
    await safeGet(

      `/api/v1/courses/${courseId}/pages/${url}`

    );

  return res.data;

}


/* =========================================================
   ASSIGNMENTS
   ========================================================= */

async function fetchAssignments(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/assignments?per_page=100`

  );

}


/* =========================================================
   DISCUSSIONS
   ========================================================= */

async function fetchDiscussions(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/discussion_topics?per_page=100`

  );

}


/* =========================================================
   FILES
   ========================================================= */

async function fetchFiles(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/files?per_page=100`

  );

}


/* =========================================================
   QUIZZES
   ========================================================= */

async function fetchQuizzes(
  courseId
) {

  return paginate(

    `/api/v1/courses/${courseId}/quizzes?per_page=100`

  );

}


/* =========================================================
   MASTER ECCU FETCH
   ========================================================= */

async function fetchAllCanvas() {

  console.log(
    "\n========================================"
  );

  console.log(
    "🚀 STARTING ECCU CANVAS FETCH"
  );

  console.log(
    "========================================\n"
  );


  const courses =
    await fetchCourses();


  if (
    !courses ||
    courses.length === 0
  ) {

    console.log(
      "⚠️ No courses selected for indexing"
    );

    return [];

  }


  for (
    const course of courses
  ) {

    try {

      console.log(
        "\n----------------------------------------"
      );

      console.log(
        "📘 FETCHING COURSE:",
        course.name
      );

      console.log(
        "🆔 Canvas Course ID:",
        course.id
      );

      console.log(
        "🎯 Config:",
        course.aiTutorConfigKey
      );

      console.log(
        "----------------------------------------"
      );


      /* =====================================================
         MODULES
         ===================================================== */

      console.log(
        "📦 Fetching modules..."
      );


      const modules =
        await fetchModules(
          course.id
        );


      course.modules =
        modules;


      console.log(
        "📦 Modules:",
        modules.length
      );


      for (
        const mod of modules
      ) {

        try {

          mod.items =
            await fetchModuleItems(
              course.id,
              mod.id
            );

        }

        catch (err) {

          console.log(

            "⚠️ Failed to fetch items for module:",
            mod.name,
            "|",
            err.message

          );

          mod.items = [];

        }

      }


      /* =====================================================
         PAGES
         ===================================================== */

      console.log(
        "📄 Fetching pages..."
      );


      course.pages =
        await fetchPages(
          course.id
        );


      console.log(
        "📄 Pages:",
        course.pages.length
      );


      /* =====================================================
         ASSIGNMENTS
         ===================================================== */

      console.log(
        "📝 Fetching assignments..."
      );


      course.assignments =
        await fetchAssignments(
          course.id
        );


      console.log(
        "📝 Assignments:",
        course.assignments.length
      );


      /* =====================================================
         DISCUSSIONS
         ===================================================== */

      console.log(
        "💬 Fetching discussions..."
      );


      course.discussions =
        await fetchDiscussions(
          course.id
        );


      console.log(
        "💬 Discussions:",
        course.discussions.length
      );


      /* =====================================================
         FILES
         ===================================================== */

      console.log(
        "📁 Fetching files..."
      );


      course.files =
        await fetchFiles(
          course.id
        );


      console.log(
        "📁 Files:",
        course.files.length
      );


      /* =====================================================
         QUIZZES
         ===================================================== */

      console.log(
        "❓ Fetching quizzes..."
      );


      course.quizzes =
        await fetchQuizzes(
          course.id
        );


      console.log(
        "❓ Quizzes:",
        course.quizzes.length
      );


      /* =====================================================
         PAGE BODY
         ===================================================== */

      console.log(
        "📄 Fetching page bodies..."
      );


      /*
        Keep the existing 50-page limit
        to avoid excessive Canvas API
        requests during development.
      */

      for (
        const p of course.pages.slice(
          0,
          50
        )
      ) {

        try {

          const body =
            await fetchPageBody(
              course.id,
              p.url
            );


          p.body =
            body.body;


        }

        catch (err) {

          console.log(

            "⚠️ Could not fetch page body:",
            p.url

          );

          p.body = "";

        }

      }


      await sleep(500);


      console.log(
        "✅ COURSE FETCH COMPLETE:",
        course.name
      );


    }

    catch (e) {

      console.error(
        "⚠️ Skipping course:",
        course.name
      );

      console.error(
        "Reason:",
        e.message
      );

    }

  }


  console.log(
    "\n========================================"
  );

  console.log(
    "🎉 CANVAS FETCH COMPLETE"
  );

  console.log(
    "📚 Courses returned:",
    courses.length
  );

  console.log(
    "========================================\n"
  );


  return courses;

}


/* =========================================================
   EXPORTS
   ========================================================= */

module.exports = {

  fetchAllCanvas,

  fetchUserEnrollments,

  fetchCourses,

  fetchModules,

  fetchModuleItems,

  fetchAssignments,

  fetchDiscussions,

  fetchQuizzes,

  fetchFiles,

  fetchPages,

  fetchPageBody

};