const courseMappings = require("../config/courseMappings");
const courseConfigs = require("../config/courseConfig");

function detectCourse(courseCode, courseId) {

    // 1. Try Course ID first (Master + Term shells)
    if (courseId) {
        const configKey = courseMappings[courseId];

        if (configKey && courseConfigs[configKey]) {
            return courseConfigs[configKey];
        }
    }

    // 2. Fallback to course code
    if (courseCode) {

        const normalizedCode = courseCode
            .replace(/\s+/g, "")
            .toUpperCase();

        const key = `${normalizedCode}_CONFIG`;

        if (courseConfigs[key]) {
            return courseConfigs[key];
        }
    }

    return null;
}

module.exports = detectCourse;