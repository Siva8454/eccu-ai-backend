const courseConfigs =
  require("../config/courseConfig");

function detectCourse(courseCode) {

  if (!courseCode) {
    return null;
  }

  const normalizedCode = courseCode
    .replace(/\s+/g, "")
    .toUpperCase();

  // DEBUG LOGS
  console.log("Course Code:", courseCode);
  console.log("Looking for:", `${normalizedCode}_CONFIG`);

  return (
    courseConfigs[`${normalizedCode}_CONFIG`] ||
    null
  );

}

module.exports = detectCourse;