require("dotenv").config();

const fs = require("fs");
const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

console.log("ENV FILE:", path.join(__dirname, "../.env"));
console.log("BASE:", process.env.CANVAS_BASE_URL);
console.log("TOKEN:", !!process.env.CANVAS_TOKEN);

const {
  fetchCourses,
  fetchModules,
  fetchModuleItems,
  fetchAssignments,
  fetchDiscussions,
  fetchQuizzes,
  fetchPages,
  fetchPageBody,
  fetchFiles
} = require("./canvasFetcher");

const CACHE_DIR = path.join(__dirname, "../data/cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function stripHtml(html = "") {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildCanvasCache() {
  console.log("🔄 Fetching courses from Canvas...");

  const courses = await fetchCourses();

  console.log("COURSES FOUND:", courses.length);
console.log(courses);

  for (const course of courses) {
    const courseId = Number(course.id);
    const courseName = course.name;

    console.log(`📘 Processing: ${courseName} (${courseId})`);

    const modules = await fetchModules(courseId);
    const assignments = await fetchAssignments(courseId);
    const discussions = await fetchDiscussions(courseId);
    const pages = await fetchPages(courseId);
    const files = await fetchFiles(courseId);
    const quizzes = await fetchQuizzes(courseId);

/* FETCH PAGE BODIES */
for (const p of pages) {
  try {
    const fullPage = await fetchPageBody(courseId, p.url);
    p.body = stripHtml(fullPage.body);
  } catch (err) {
    console.log("Failed page:", p.title);
  }
}

const courseData = {
  id: courseId,
  name: courseName,
  code: course.course_code,

  modules: await Promise.all(
    modules.map(async (m) => ({
      id: m.id,
      name: m.name,
      items: await fetchModuleItems(courseId, m.id)
    }))
  ),

  assignments,
  discussions,
  quizzes,

  pages: pages.map(p => ({
    title: p.title,
    url: p.url,
    body: p.body || ""
  })),

  files
};

    const filePath = path.join(CACHE_DIR, `course_${courseId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2));

    console.log(`✅ Cached: ${filePath}`);
  }

  console.log("🎉 Canvas cache build completed!");
}

module.exports = { buildCanvasCache };

buildCanvasCache()
  .then(() => {
    console.log("✅ CACHE BUILD COMPLETE");
  })
  .catch(err => {
    console.error("❌ CACHE BUILD FAILED");
    console.error(err);
  });
