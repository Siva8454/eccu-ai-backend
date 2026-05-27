const axios = require("axios");
console.log("🟢 UPDATED CANVAS FETCHER LOADED");

const BASE = process.env.CANVAS_BASE_URL;
const TOKEN = process.env.CANVAS_TOKEN;

const MASTER_BLUEPRINT_TERM_ID = 297; // ✅ ECCU Master Blueprint

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${TOKEN}` },
  timeout: 30000
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* -------------------------------------------------- */
/* SAFE GET WITH RETRY */
/* -------------------------------------------------- */
async function safeGet(url, retries = 3) {
  try {
    return await api.get(url);
  } catch (err) {
    if (retries > 0) {
      console.log("⚠️ Retry:", url);
      await sleep(1500);
      return safeGet(url, retries - 1);
    }
    throw err;
  }
}

/* -------------------------------------------------- */
/* PAGINATION */
/* -------------------------------------------------- */
async function paginate(url) {
  let results = [];

  while (url) {
    const res = await safeGet(url);
    results.push(...res.data);

    const link = res.headers.link;
    const next = link?.match(/<([^>]+)>;\s*rel="next"/);
    url = next ? next[1].replace(BASE, "") : null;

    await sleep(200);
  }

  return results;
}

/* -------------------------------------------------- */
/* ACTIVE TERM DETECTION */
/* -------------------------------------------------- */
async function getActiveTermId() {
  const res = await safeGet("/api/v1/accounts/1/terms");

  const terms = res.data.enrollment_terms;

  const active = terms.find(t => t.workflow_state === "active");

  if (!active) {
    throw new Error("No active term found in Canvas");
  }

  console.log("🎯 Active Term:", active.name, "| ID:", active.id);

  return active.id;
}

/* -------------------------------------------------- */
/* FETCH USER ENROLLMENTS */
/* -------------------------------------------------- */
async function fetchUserEnrollments() {
  return await paginate(
    "/api/v1/users/self/enrollments?state[]=active&per_page=100"
  );
}

/* -------------------------------------------------- */
/* FETCH ONLY MASTER BLUEPRINT + ACTIVE TERM COURSES */
/* -------------------------------------------------- */

/* -------------------------------------------------- */
/* FETCH ONLY SELECTED COURSES (DEV MODE) */
/* -------------------------------------------------- */

const DEV_COURSES = [2213, 2460]; // ✅ Only index these courses

async function fetchCourses() {

  console.log("🔥 DEV MODE ACTIVE — Only fetching selected courses");

  const activeTermId = await getActiveTermId();

  const courses = await paginate("/api/v1/accounts/1/courses?per_page=100");

  const filtered = courses.filter(c =>
    c.workflow_state === "available" &&
    !c.name?.toLowerCase().includes("test") &&
    DEV_COURSES.includes(c.id) &&
    (
      c.enrollment_term_id === MASTER_BLUEPRINT_TERM_ID ||
      c.enrollment_term_id === activeTermId
    )
  );

  console.log(`✅ Courses selected for indexing: ${filtered.length}`);

  filtered.forEach(c => {
    console.log("📘 DEV COURSE:", c.name, "| ID:", c.id);
  });

  return filtered;
}

/* -------------------------------------------------- */
/* MODULES + ITEMS */
/* -------------------------------------------------- */
async function fetchModules(courseId) {
  return paginate(`/api/v1/courses/${courseId}/modules?per_page=100`);
}

async function fetchModuleItems(courseId, moduleId) {
  return paginate(`/api/v1/courses/${courseId}/modules/${moduleId}/items?per_page=100`);
}

/* -------------------------------------------------- */
/* EXTRA CONTENT */
/* -------------------------------------------------- */
async function fetchPages(courseId) {
  return paginate(`/api/v1/courses/${courseId}/pages?per_page=100`);
}

async function fetchPageBody(courseId, url) {
  const res = await safeGet(`/api/v1/courses/${courseId}/pages/${url}`);
  return res.data;
}

async function fetchAssignments(courseId) {
  return paginate(`/api/v1/courses/${courseId}/assignments?per_page=100`);
}

async function fetchDiscussions(courseId) {
  return paginate(`/api/v1/courses/${courseId}/discussion_topics?per_page=100`);
}

async function fetchFiles(courseId) {
  return paginate(`/api/v1/courses/${courseId}/files?per_page=100`);
}

/* -------------------------------------------------- */
/* MASTER ECCU FETCH */
/* -------------------------------------------------- */
async function fetchAllCanvas() {
  const courses = await fetchCourses();

  for (const course of courses) {
    try {
      console.log("📘 Course:", course.name);

      /* modules */
      const modules = await fetchModules(course.id);
      course.modules = modules;

      for (const mod of modules) {
        mod.items = await fetchModuleItems(course.id, mod.id);
      }

      /* high-value content */
      course.pages = await fetchPages(course.id);
      course.assignments = await fetchAssignments(course.id);
      course.discussions = await fetchDiscussions(course.id);
      course.files = await fetchFiles(course.id);

      /* fetch page body */
      for (const p of course.pages.slice(0, 50)) {
        try {
          const body = await fetchPageBody(course.id, p.url);
          p.body = body.body;
        } catch {}
      }

      await sleep(500);

    } catch (e) {
      console.log("⚠️ Skipping course:", course.name);
    }
  }

  return courses;
}

module.exports = {
  fetchAllCanvas,
  fetchUserEnrollments
};