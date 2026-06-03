const courseConfigs =
  require("../config/courseConfig");

function detectCourse(courseCode) {

  if (!courseCode) {
    return null;
  }

  return (
    courseConfigs[courseCode] ||
    null
  );

}

module.exports = detectCourse;