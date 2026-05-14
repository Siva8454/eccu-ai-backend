const fs = require("fs");
const path = require("path");
const {
  fetchCourses,
  fetchModules,
  fetchAssignments,
} = require("./canvasFetcher");

const CACHE_DIR = path.join(__dirname, "../data/cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function buildCanvasCache() {
  console.log("🔄 Fetching courses from Canvas...");

  const courses = await fetchCourses();

  for (const course of courses) {
    const courseId = Number(course.id);
    const courseName = course.name;

    console.log(`📘 Processing: ${courseName} (${courseId})`);

    const modules = await fetchModules(courseId);
    const assignments = await fetchAssignments(courseId);

    const courseData = {
      id: courseId,
      name: courseName,
      code: course.course_code,
      modules: modules.map(m => ({
        id: m.id,
        name: m.name,
      })),
      assignments: assignments.map(a => ({
        id: a.id,
        name: a.name,
        due_at: a.due_at,
        points: a.points_possible,
      })),
    };

    const filePath = path.join(CACHE_DIR, `course_${courseId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(courseData, null, 2));

    console.log(`✅ Cached: ${filePath}`);
  }

  console.log("🎉 Canvas cache build completed!");
}

module.exports = { buildCanvasCache };
