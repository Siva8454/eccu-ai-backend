const courseConfigs =
  require("../config/courseConfig");

function detectCourse() {

  return courseConfigs.CEH;

}

module.exports = detectCourse;